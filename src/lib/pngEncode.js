/* Xuất ảnh PNG bằng thư viện chuẩn của Node, không cài gói nào.

   Vì sao cần: hàm xuất PNG sẵn có dùng Canvas API, mà Canvas chỉ có trong
   trình duyệt. Muốn sinh file PNG từ dòng lệnh thì phải tự ghi.

   PNG thực chất khá đơn giản: một chữ ký, rồi các khối dữ liệu, mỗi khối có
   độ dài, tên, nội dung và mã kiểm tra CRC. Phần nén dùng zlib có sẵn. */

import { deflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

/* Bảng CRC32 theo chuẩn PNG, dựng một lần rồi dùng lại. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])

  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))

  return Buffer.concat([length, typeAndData, crc])
}

/* Vẽ mã QR thành PNG đen trắng.

   Mỗi ô của mã được phóng thành một khối vuông nguyên pixel — không nội suy,
   không làm mờ. Cạnh phải sắc thì máy quét mới đọc được khi in nhỏ. */
export function qrToPngBuffer(qr, options = {}) {
  const { size, modules } = qr
  const quietZone = options.quietZone ?? 4
  const target = options.size ?? 1000

  const total = size + quietZone * 2
  /* Làm tròn xuống cho mỗi ô là số pixel nguyên, rồi lấy kích thước thật
     theo đó — thà ảnh nhỏ hơn yêu cầu một chút còn hơn các ô lệch nhau. */
  const scale = Math.max(1, Math.floor(target / total))
  const width = total * scale

  /* Ảnh xám 8 bit: mỗi hàng có 1 byte đánh dấu kiểu lọc rồi tới các pixel. */
  const raw = Buffer.alloc((width + 1) * width, 0xff)

  for (let y = 0; y < width; y++) {
    raw[y * (width + 1)] = 0 // không dùng bộ lọc
    const moduleRow = Math.floor(y / scale) - quietZone
    if (moduleRow < 0 || moduleRow >= size) continue

    for (let x = 0; x < width; x++) {
      const moduleCol = Math.floor(x / scale) - quietZone
      if (moduleCol < 0 || moduleCol >= size) continue
      if (modules[moduleRow][moduleCol]) {
        raw[y * (width + 1) + 1 + x] = 0x00
      }
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(width, 4)
  ihdr[8] = 8 // 8 bit mỗi kênh
  ihdr[9] = 0 // ảnh xám
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
