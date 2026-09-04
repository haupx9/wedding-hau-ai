/**
 * qrcode.js — Bộ mã hoá QR Code tự viết từ đầu (ISO/IEC 18004), JavaScript thuần.
 *
 * KHÔNG phụ thuộc bất kỳ thư viện / npm package nào.
 *
 * API công khai:
 *   encodeQR(text: string, options?: { ec?: 'L'|'M'|'Q'|'H' })
 *     => { size: number, modules: boolean[][] }
 *
 *   - modules[row][col] === true  => ô ĐEN
 *   - modules[row][col] === false => ô TRẮNG
 *   - size = số module mỗi cạnh (KHÔNG bao gồm quiet zone; phần render tự thêm)
 *
 * Cài đặt gồm:
 *   - Byte mode (UTF-8), tự chọn version nhỏ nhất trong 1..40
 *   - Reed–Solomon trên GF(256), đa thức nguyên thuỷ 0x11D
 *   - Chia block + interleave dữ liệu/ECC đúng chuẩn
 *   - Finder / separator / timing / alignment / dark module
 *   - Format info BCH(15,5), Version info BCH(18,6)
 *   - Thử 8 mask, chấm điểm phạt theo 4 quy tắc, chọn điểm thấp nhất
 */

/* ------------------------------------------------------------------ *
 * 1. Bảng hằng số theo chuẩn
 * ------------------------------------------------------------------ */

/** Thứ tự cột: chỉ số version 0..40 (index 0 bỏ trống). */
const ECC_CODEWORDS_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

const NUM_ERROR_CORRECTION_BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 5, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** 2 bit định danh mức sửa lỗi dùng trong format information. */
const ECL_FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

/** Hệ số điểm phạt của 4 quy tắc chọn mask. */
const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/* ------------------------------------------------------------------ *
 * 2. Số học GF(256) và Reed–Solomon
 * ------------------------------------------------------------------ */

/** Nhân 2 phần tử GF(256) theo đa thức nguyên thuỷ x^8+x^4+x^3+x^2+1 (0x11D). */
function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

/**
 * Đa thức sinh Reed–Solomon bậc `degree`:
 *   g(x) = (x - a^0)(x - a^1)...(x - a^(degree-1))
 * Trả về mảng hệ số (bỏ hệ số bậc cao nhất vì luôn = 1), bậc giảm dần.
 */
function rsComputeDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1; // khởi tạo đa thức hằng 1
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** Phần dư của data(x)*x^degree chia cho divisor(x) → chính là các ECC codeword. */
function rsComputeRemainder(data, divisor) {
  const result = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * 3. Thông số hình học theo version
 * ------------------------------------------------------------------ */

/** Số module dữ liệu thô (chưa chia 8) của một version. */
function getNumRawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

/** Số codeword dữ liệu (đã trừ ECC) của version + mức EC. */
function getNumDataCodewords(ver, ecl) {
  return (
    Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl][ver]
  );
}

/** Toạ độ tâm các alignment pattern của version (áp dụng cho cả hàng và cột). */
function getAlignmentPatternPositions(ver) {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step =
    ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2) / 2) * 2;
  const result = [6];
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

/** Số bit của trường character count cho byte mode. */
function byteModeCountBits(ver) {
  return ver <= 9 ? 8 : 16;
}

/* ------------------------------------------------------------------ *
 * 4. Mã hoá dữ liệu (byte mode / UTF-8)
 * ------------------------------------------------------------------ */

function utf8Bytes(text) {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(text));
  }
  // Fallback thủ công (không phụ thuộc môi trường).
  const out = [];
  for (let i = 0; i < text.length; i++) {
    let cp = text.codePointAt(i);
    if (cp > 0xffff) i++; // surrogate pair
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return out;
}

/** Ghi `len` bit thấp của `val` vào mảng bit. */
function appendBits(bits, val, len) {
  for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
}

/**
 * Sinh chuỗi codeword dữ liệu hoàn chỉnh (đã có terminator + padding).
 */
function buildDataCodewords(bytes, ver, ecl) {
  const capacityBits = getNumDataCodewords(ver, ecl) * 8;
  const bits = [];
  appendBits(bits, 0b0100, 4); // mode indicator: byte mode
  appendBits(bits, bytes.length, byteModeCountBits(ver));
  for (const b of bytes) appendBits(bits, b, 8);

  // Terminator: tối đa 4 bit 0
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  // Đệm tới bội số của 8
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);

  // Đệm luân phiên 0xEC / 0x11
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) {
    appendBits(bits, pad, 8);
  }

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }
  return codewords;
}

/**
 * Thêm ECC cho từng block rồi interleave theo chuẩn.
 */
function addEccAndInterleave(data, ver, ecl) {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][ver];
  const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const divisor = rsComputeDivisor(blockEccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = data.slice(k, k + dataLen);
    k += dataLen;
    const ecc = rsComputeRemainder(dat, divisor);
    const padded = dat.slice();
    if (i < numShortBlocks) padded.push(0); // ô trống ảo để mọi block cùng độ dài
    blocks.push(padded.concat(ecc));
  }

  // Interleave theo cột, bỏ qua ô trống ảo của các short block.
  const result = [];
  const shortDataLen = shortBlockLen - blockEccLen;
  for (let i = 0; i < shortBlockLen + 1; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i !== shortDataLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return result;
}

/* ------------------------------------------------------------------ *
 * 5. BCH cho format info và version info
 * ------------------------------------------------------------------ */

/** BCH(15,5) + XOR mask 0x5412 → 15 bit format information. */
function computeFormatBits(ecl, mask) {
  const data = (ECL_FORMAT_BITS[ecl] << 3) | mask; // 5 bit
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return (((data << 10) | rem) ^ 0x5412) & 0x7fff;
}

/** BCH(18,6) → 18 bit version information (chỉ dùng cho version >= 7). */
function computeVersionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  }
  return ((ver << 12) | rem) & 0x3ffff;
}

/* ------------------------------------------------------------------ *
 * 6. Dựng ma trận module
 * ------------------------------------------------------------------ */

class Matrix {
  constructor(ver) {
    this.version = ver;
    this.size = ver * 4 + 17;
    this.modules = Array.from({ length: this.size }, () =>
      new Array(this.size).fill(false)
    );
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array(this.size).fill(false)
    );
  }

  /** row/col; đánh dấu luôn là function module. */
  setFn(row, col, dark) {
    this.modules[row][col] = dark;
    this.isFunction[row][col] = true;
  }

  drawFinder(centerRow, centerCol) {
    for (let dr = -4; dr <= 4; dr++) {
      for (let dc = -4; dc <= 4; dc++) {
        const dist = Math.max(Math.abs(dr), Math.abs(dc)); // chuẩn Chebyshev
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
          this.setFn(r, c, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  drawAlignment(centerRow, centerCol) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const dist = Math.max(Math.abs(dr), Math.abs(dc));
        this.setFn(centerRow + dr, centerCol + dc, dist !== 1);
      }
    }
  }

  drawFunctionPatterns() {
    const size = this.size;

    // Timing patterns
    for (let i = 0; i < size; i++) {
      this.setFn(6, i, i % 2 === 0);
      this.setFn(i, 6, i % 2 === 0);
    }

    // 3 finder pattern + separator (vẽ vùng 9x9, phần ngoài rìa bị cắt)
    this.drawFinder(3, 3);
    this.drawFinder(3, size - 4);
    this.drawFinder(size - 4, 3);

    // Alignment patterns
    const pos = getAlignmentPatternPositions(this.version);
    const n = pos.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Bỏ 3 góc trùng finder pattern
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === n - 1) ||
          (i === n - 1 && j === 0)
        ) {
          continue;
        }
        this.drawAlignment(pos[i], pos[j]);
      }
    }

    // Format info (đặt tạm với mask 0; sẽ ghi lại sau khi chọn mask)
    this.drawFormatBits(0, 'M');
    this.drawVersionBits();
  }

  drawFormatBits(mask, ecl) {
    const bits = computeFormatBits(ecl, mask);
    const size = this.size;
    const bit = (i) => ((bits >>> i) & 1) !== 0;

    // Bản sao 1: quanh finder trên-trái
    for (let i = 0; i <= 5; i++) this.setFn(i, 8, bit(i));
    this.setFn(7, 8, bit(6));
    this.setFn(8, 8, bit(7));
    this.setFn(8, 7, bit(8));
    for (let i = 9; i < 15; i++) this.setFn(8, 14 - i, bit(i));

    // Bản sao 2: dưới finder trên-phải + phải finder dưới-trái
    for (let i = 0; i < 8; i++) this.setFn(8, size - 1 - i, bit(i));
    for (let i = 8; i < 15; i++) this.setFn(size - 15 + i, 8, bit(i));

    // Dark module (luôn đen)
    this.setFn(size - 8, 8, true);
  }

  drawVersionBits() {
    if (this.version < 7) return;
    const bits = computeVersionBits(this.version);
    const size = this.size;
    for (let i = 0; i < 18; i++) {
      const b = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const d = Math.floor(i / 3);
      this.setFn(d, a, b); // khối trên-phải
      this.setFn(a, d, b); // khối dưới-trái
    }
  }

  /** Rải codeword theo đường zigzag chuẩn (phải→trái, cột đôi, đảo chiều). */
  drawCodewords(codewords) {
    const size = this.size;
    let i = 0; // chỉ số bit
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // bỏ cột timing
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const col = right - j;
          const upward = ((right + 1) & 2) === 0;
          const row = upward ? size - 1 - vert : vert;
          if (!this.isFunction[row][col] && i < codewords.length * 8) {
            this.modules[row][col] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
          // Các module dư (remainder bits) giữ nguyên false.
        }
      }
    }
  }

  applyMask(mask) {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.isFunction[row][col]) continue;
        if (maskCondition(mask, row, col)) {
          this.modules[row][col] = !this.modules[row][col];
        }
      }
    }
  }

  /** Điểm phạt theo 4 quy tắc của ISO/IEC 18004 §8.8.2. */
  penaltyScore() {
    const size = this.size;
    const m = this.modules;
    let result = 0;

    // --- Quy tắc 1: dãy >= 5 module cùng màu theo hàng và cột ---
    for (let row = 0; row < size; row++) {
      let runColor = m[row][0];
      let runLen = 1;
      for (let col = 1; col < size; col++) {
        if (m[row][col] === runColor) {
          runLen++;
        } else {
          if (runLen >= 5) result += PENALTY_N1 + (runLen - 5);
          runColor = m[row][col];
          runLen = 1;
        }
      }
      if (runLen >= 5) result += PENALTY_N1 + (runLen - 5);
    }
    for (let col = 0; col < size; col++) {
      let runColor = m[0][col];
      let runLen = 1;
      for (let row = 1; row < size; row++) {
        if (m[row][col] === runColor) {
          runLen++;
        } else {
          if (runLen >= 5) result += PENALTY_N1 + (runLen - 5);
          runColor = m[row][col];
          runLen = 1;
        }
      }
      if (runLen >= 5) result += PENALTY_N1 + (runLen - 5);
    }

    // --- Quy tắc 2: khối 2x2 cùng màu ---
    for (let row = 0; row < size - 1; row++) {
      for (let col = 0; col < size - 1; col++) {
        const c = m[row][col];
        if (c === m[row][col + 1] && c === m[row + 1][col] && c === m[row + 1][col + 1]) {
          result += PENALTY_N2;
        }
      }
    }

    // --- Quy tắc 3: mẫu 1:1:3:1:1 kèm 4 module sáng (giống finder) ---
    // Quét cửa sổ 11 module trên hàng và cột, có đệm ảo (sáng) ở hai đầu.
    const P1 = [true, false, true, true, true, false, true, false, false, false, false];
    const P2 = [false, false, false, false, true, false, true, true, true, false, true];
    const lineAt = (arr, idx) => (idx < 0 || idx >= size ? false : arr(idx));

    for (let row = 0; row < size; row++) {
      const get = (i) => m[row][i];
      for (let start = -4; start + 11 <= size + 4; start++) {
        if (matchWindow(get, lineAt, start, P1, size)) result += PENALTY_N3;
        if (matchWindow(get, lineAt, start, P2, size)) result += PENALTY_N3;
      }
    }
    for (let col = 0; col < size; col++) {
      const get = (i) => m[i][col];
      for (let start = -4; start + 11 <= size + 4; start++) {
        if (matchWindow(get, lineAt, start, P1, size)) result += PENALTY_N3;
        if (matchWindow(get, lineAt, start, P2, size)) result += PENALTY_N3;
      }
    }

    // --- Quy tắc 4: tỉ lệ module đen lệch khỏi 50% ---
    let dark = 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) if (m[row][col]) dark++;
    }
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * PENALTY_N4;

    return result;
  }
}

function matchWindow(get, lineAt, start, pattern, size) {
  for (let i = 0; i < 11; i++) {
    if (lineAt(get, start + i) !== pattern[i]) return false;
  }
  return true;
}

/** 8 điều kiện mask chuẩn. */
function maskCondition(mask, row, col) {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: throw new Error('Mask không hợp lệ: ' + mask);
  }
}

/* ------------------------------------------------------------------ *
 * 7. API công khai
 * ------------------------------------------------------------------ */

/**
 * Mã hoá `text` thành ma trận module QR.
 *
 * @param {string} text
 * @param {{ ec?: 'L'|'M'|'Q'|'H' }} [options]
 * @returns {{ size: number, modules: boolean[][], version: number, ec: string, mask: number }}
 */
export function encodeQR(text, options) {
  const opts = options || {};
  const ecl = opts.ec || 'M';
  if (!Object.prototype.hasOwnProperty.call(ECL_FORMAT_BITS, ecl)) {
    throw new Error("Mức sửa lỗi không hợp lệ: " + ecl + " (chỉ nhận 'L','M','Q','H')");
  }
  if (typeof text !== 'string') {
    throw new Error('encodeQR: text phải là chuỗi');
  }

  const bytes = utf8Bytes(text);

  // Chọn version nhỏ nhất chứa đủ dữ liệu
  let version = -1;
  for (let ver = 1; ver <= 40; ver++) {
    const capacityBits = getNumDataCodewords(ver, ecl) * 8;
    const neededBits = 4 + byteModeCountBits(ver) + bytes.length * 8;
    if (neededBits <= capacityBits) {
      version = ver;
      break;
    }
  }
  if (version < 0) {
    throw new Error(
      'Dữ liệu quá dài (' + bytes.length + ' byte) — vượt sức chứa QR version 40 mức ' + ecl
    );
  }

  const dataCodewords = buildDataCodewords(bytes, version, ecl);
  const allCodewords = addEccAndInterleave(dataCodewords, version, ecl);

  const mtx = new Matrix(version);
  mtx.drawFunctionPatterns();
  mtx.drawCodewords(allCodewords);

  // Thử cả 8 mask, chọn mask có điểm phạt nhỏ nhất
  let bestMask = 0;
  let minPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    mtx.applyMask(mask);
    mtx.drawFormatBits(mask, ecl);
    const penalty = mtx.penaltyScore();
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = mask;
    }
    mtx.applyMask(mask); // XOR lần 2 => hoàn tác
  }

  mtx.applyMask(bestMask);
  mtx.drawFormatBits(bestMask, ecl);

  return {
    size: mtx.size,
    modules: mtx.modules,
    version,
    ec: ecl,
    mask: bestMask,
  };
}

export default encodeQR;
