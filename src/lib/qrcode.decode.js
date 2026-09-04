/**
 * qrcode.decode.js — Bộ GIẢI MÃ QR Code độc lập, JavaScript thuần.
 *
 * Mục đích: kiểm chứng chéo (cross-check) bộ mã hoá trong `qrcode.js`.
 * File này KHÔNG import bất cứ thứ gì từ encoder — mọi bảng hằng số, bản đồ
 * function module và logic đọc bit đều được viết lại độc lập từ mô tả chuẩn
 * ISO/IEC 18004, theo hướng "đọc như một máy quét", chứ không phải đảo ngược
 * trực tiếp các bước của encoder.
 *
 * API:
 *   decodeQR(modules: boolean[][]) => {
 *     text, version, size, ec, mask, mode, charCount, dataCodewords
 *   }
 *
 * Quy trình:
 *   1. Suy ra version từ kích thước ma trận
 *   2. Đọc 15 bit format information (2 bản sao), sửa lỗi BCH(15,5) → EC level + mask
 *   3. Dựng bản đồ function module, bỏ mask khỏi vùng dữ liệu
 *   4. Đọc codeword theo đường zigzag chuẩn
 *   5. De-interleave, tách phần dữ liệu của từng block
 *   6. Đọc mode indicator + character count, giải UTF-8
 *
 * Không cài sửa lỗi Reed–Solomon (dữ liệu tự sinh, không nhiễu), nhưng có
 * kiểm tra tính nhất quán của format information.
 */

/* ------------------------------------------------------------------ *
 * Bảng hằng số (viết lại độc lập, tra theo version 1..40)
 * ------------------------------------------------------------------ */

// Số ECC codeword mỗi block, hàng = L,M,Q,H; cột = version (index 0 để trống).
const EC_PER_BLOCK = [
  [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

// Số block, hàng = L,M,Q,H.
const BLOCK_COUNT = [
  [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [0, 1, 1, 2, 4, 4, 4, 5, 5, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

// Chỉ số hàng trong 2 bảng trên: 0=L, 1=M, 2=Q, 3=H
const EC_ORDER = ['L', 'M', 'Q', 'H'];
// 2 bit format ↔ mức EC: 00=M, 01=L, 10=H, 11=Q
const FORMAT_BITS_TO_EC = ['M', 'L', 'H', 'Q'];

/* ------------------------------------------------------------------ *
 * Tiện ích hình học (tính lại độc lập)
 * ------------------------------------------------------------------ */

/** Số module khả dụng cho codeword (công thức đóng theo chuẩn). */
function rawDataModuleCount(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    result -= (25 * n - 10) * n - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function alignmentCenters(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2) / 2) * 2;
  const out = [6];
  for (let pos = ver * 4 + 10; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

/**
 * Dựng bản đồ vị trí function module cho một version.
 * Trả về mảng boolean[row][col]: true = ô thuộc vùng chức năng (không chứa dữ liệu).
 */
function buildFunctionMap(ver) {
  const size = ver * 4 + 17;
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const mark = (r, c) => {
    if (r >= 0 && r < size && c >= 0 && c < size) fn[r][c] = true;
  };

  // Finder + separator: 3 khối 8x8 ở 3 góc (7x7 finder + 1 dải tách)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      mark(r, c);
      mark(r, size - 1 - c);
      mark(size - 1 - r, c);
    }
  }

  // Timing patterns
  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }

  // Format information: dải quanh finder trên-trái + 2 dải ở finder còn lại
  for (let i = 0; i < 9; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, size - 1 - i);
    mark(size - 1 - i, 8);
  }

  // Alignment patterns (bỏ 3 vị trí chồng finder)
  const centers = alignmentCenters(ver);
  const last = centers.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) mark(centers[i] + dr, centers[j] + dc);
      }
    }
  }

  // Version information (version >= 7): 2 khối 6x3
  if (ver >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        mark(i, size - 11 + j);
        mark(size - 11 + j, i);
      }
    }
  }

  return fn;
}

/* ------------------------------------------------------------------ *
 * Format information: đọc + sửa lỗi BCH(15,5)
 * ------------------------------------------------------------------ */

function bchFormatEncode(data5) {
  let rem = data5;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return (((data5 << 10) | rem) ^ 0x5412) & 0x7fff;
}

function popcount(x) {
  let n = 0;
  while (x) {
    n += x & 1;
    x >>>= 1;
  }
  return n;
}

/**
 * Tìm 5 bit dữ liệu format gần nhất (khoảng cách Hamming nhỏ nhất) với 15 bit đọc được.
 * Trả về { data5, distance } hoặc null nếu mơ hồ / quá xa.
 */
function correctFormat(raw15) {
  let best = -1;
  let bestDist = 99;
  let tie = false;
  for (let d = 0; d < 32; d++) {
    const dist = popcount(bchFormatEncode(d) ^ raw15);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
      tie = false;
    } else if (dist === bestDist) {
      tie = true;
    }
  }
  if (bestDist > 3 || (tie && bestDist > 0)) return null;
  return { data5: best, distance: bestDist };
}

/** Đọc 15 bit format info bản sao 1 (quanh finder trên-trái). */
function readFormatCopy1(m, size) {
  const bit = (r, c) => (m[r][c] ? 1 : 0);
  let bits = 0;
  // bit 0..5 nằm ở cột 8, hàng 0..5
  for (let i = 0; i <= 5; i++) bits |= bit(i, 8) << i;
  bits |= bit(7, 8) << 6;
  bits |= bit(8, 8) << 7;
  bits |= bit(8, 7) << 8;
  // bit 9..14 nằm ở hàng 8, cột 5..0
  for (let i = 9; i < 15; i++) bits |= bit(8, 14 - i) << i;
  return bits;
}

/** Đọc 15 bit format info bản sao 2 (dưới finder trên-phải + cạnh finder dưới-trái). */
function readFormatCopy2(m, size) {
  const bit = (r, c) => (m[r][c] ? 1 : 0);
  let bits = 0;
  for (let i = 0; i < 8; i++) bits |= bit(8, size - 1 - i) << i;
  for (let i = 8; i < 15; i++) bits |= bit(size - 15 + i, 8) << i;
  return bits;
}

/* ------------------------------------------------------------------ *
 * Version information (kiểm tra chéo với kích thước ma trận)
 * ------------------------------------------------------------------ */

function bchVersionEncode(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return ((ver << 12) | rem) & 0x3ffff;
}

function readVersionInfo(m, size) {
  let bits = 0;
  for (let i = 0; i < 18; i++) {
    const a = size - 11 + (i % 3);
    const d = Math.floor(i / 3);
    if (m[d][a]) bits |= 1 << i;
  }
  // Tìm version khớp nhất
  let best = -1;
  let bestDist = 99;
  for (let v = 7; v <= 40; v++) {
    const dist = popcount(bchVersionEncode(v) ^ bits);
    if (dist < bestDist) {
      bestDist = dist;
      best = v;
    }
  }
  return { version: best, distance: bestDist, raw: bits };
}

/* ------------------------------------------------------------------ *
 * Mask (định nghĩa lại từ chuẩn)
 * ------------------------------------------------------------------ */

const MASK_FUNCTIONS = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (((r / 2) | 0) + ((c / 3) | 0)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/* ------------------------------------------------------------------ *
 * Giải UTF-8 (tự viết, có fallback)
 * ------------------------------------------------------------------ */

function utf8Decode(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes));
  }
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i];
    let cp;
    let len;
    if (b0 < 0x80) {
      cp = b0;
      len = 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      cp = b0 & 0x1f;
      len = 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      cp = b0 & 0x0f;
      len = 3;
    } else {
      cp = b0 & 0x07;
      len = 4;
    }
    for (let k = 1; k < len; k++) cp = (cp << 6) | (bytes[i + k] & 0x3f);
    out += String.fromCodePoint(cp);
    i += len;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * API công khai
 * ------------------------------------------------------------------ */

/**
 * Giải mã ma trận module QR thành chuỗi text.
 *
 * @param {boolean[][]} modules  modules[row][col], true = ô đen, KHÔNG có quiet zone
 * @returns {{ text: string, version: number, size: number, ec: string,
 *             mask: number, mode: number, charCount: number, dataCodewords: number[] }}
 */
export function decodeQR(modules) {
  if (!Array.isArray(modules) || modules.length === 0) {
    throw new Error('decodeQR: modules phải là mảng 2 chiều không rỗng');
  }
  const size = modules.length;
  for (const row of modules) {
    if (!Array.isArray(row) || row.length !== size) {
      throw new Error('decodeQR: ma trận phải vuông (size = ' + size + ')');
    }
  }
  if ((size - 17) % 4 !== 0) {
    throw new Error('decodeQR: kích thước ' + size + ' không hợp lệ cho QR (phải là 4v+17)');
  }
  const version = (size - 17) / 4;
  if (version < 1 || version > 40) {
    throw new Error('decodeQR: version suy ra được (' + version + ') nằm ngoài 1..40');
  }

  // --- Bước 1: format information ---
  const raw1 = readFormatCopy1(modules, size);
  const raw2 = readFormatCopy2(modules, size);
  let fmt = correctFormat(raw1);
  if (!fmt) fmt = correctFormat(raw2);
  if (!fmt) {
    throw new Error('decodeQR: không đọc được format information (BCH không khớp)');
  }
  const ec = FORMAT_BITS_TO_EC[(fmt.data5 >> 3) & 3];
  const mask = fmt.data5 & 7;

  // --- Bước 1b: đối chiếu version information nếu có ---
  if (version >= 7) {
    const vi = readVersionInfo(modules, size);
    if (vi.distance > 3 || vi.version !== version) {
      throw new Error(
        'decodeQR: version information không khớp — đọc được v' +
          vi.version +
          ' (dist=' +
          vi.distance +
          ') nhưng kích thước cho v' +
          version
      );
    }
  }

  // --- Bước 2: bỏ mask khỏi vùng dữ liệu ---
  const fnMap = buildFunctionMap(version);
  const maskFn = MASK_FUNCTIONS[mask];
  const unmasked = modules.map((row, r) =>
    row.map((v, c) => (!fnMap[r][c] && maskFn(r, c) ? !v : v))
  );

  // --- Bước 3: đọc bit theo đường zigzag chuẩn ---
  const rawCodewords = Math.floor(rawDataModuleCount(version) / 8);
  const bitsNeeded = rawCodewords * 8;
  const bits = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (!fnMap[row][col] && bits.length < bitsNeeded) {
          bits.push(unmasked[row][col] ? 1 : 0);
        }
      }
    }
  }
  if (bits.length < bitsNeeded) {
    throw new Error(
      'decodeQR: thiếu module dữ liệu (' + bits.length + '/' + bitsNeeded + ')'
    );
  }
  const codewords = [];
  for (let i = 0; i < bitsNeeded; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  // --- Bước 4: de-interleave, lấy phần dữ liệu của từng block ---
  const eci = EC_ORDER.indexOf(ec);
  const numBlocks = BLOCK_COUNT[eci][version];
  const eccLen = EC_PER_BLOCK[eci][version];
  const shortTotal = Math.floor(rawCodewords / numBlocks);
  const numShort = numBlocks - (rawCodewords % numBlocks);
  const shortDataLen = shortTotal - eccLen;

  // Mỗi block dài shortTotal+1 ô (short block có 1 ô "ảo" tại vị trí shortDataLen).
  const blocks = Array.from({ length: numBlocks }, () => new Array(shortTotal + 1).fill(null));
  let idx = 0;
  for (let i = 0; i < shortTotal + 1; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i !== shortDataLen || j >= numShort) {
        blocks[j][i] = codewords[idx++];
      }
    }
  }

  const dataCodewords = [];
  for (let j = 0; j < numBlocks; j++) {
    const len = shortDataLen + (j < numShort ? 0 : 1);
    for (let i = 0; i < len; i++) dataCodewords.push(blocks[j][i]);
  }

  // --- Bước 5: đọc bit stream dữ liệu ---
  const dataBits = [];
  for (const b of dataCodewords) {
    for (let i = 7; i >= 0; i--) dataBits.push((b >>> i) & 1);
  }

  let p = 0;
  const take = (n) => {
    if (p + n > dataBits.length) {
      throw new Error('decodeQR: hết bit khi đang đọc (' + n + ' bit)');
    }
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | dataBits[p + i];
    p += n;
    return v;
  };

  const mode = take(4);
  if (mode === 0) {
    // Terminator ngay đầu — chuỗi rỗng không có segment nào.
    return { text: '', version, size, ec, mask, mode, charCount: 0, dataCodewords };
  }
  if (mode !== 0b0100) {
    throw new Error(
      'decodeQR: chỉ hỗ trợ byte mode (0100), gặp mode 0b' + mode.toString(2).padStart(4, '0')
    );
  }
  const countBits = version <= 9 ? 8 : 16;
  const charCount = take(countBits);

  const payload = [];
  for (let i = 0; i < charCount; i++) payload.push(take(8));

  const text = utf8Decode(payload);

  return { text, version, size, ec, mask, mode, charCount, dataCodewords };
}

export default decodeQR;
