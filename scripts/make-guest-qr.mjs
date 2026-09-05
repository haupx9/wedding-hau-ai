/* Sinh mã QR riêng cho từng khách trong danh sách.

   Chạy:  npm run qr:khach
   (chạy python scripts/guests.py export trước để có print/guests.json)

   Mỗi khách được một mã QR riêng, mang theo mã khách và tên của chính
   người đó:  .../?g=K001&n=Nguy%E1%BB%85n%20V%C4%83n%20A#rsvp

   Vì sao gắn mã khách và tên: để phản hồi khớp đúng dòng trong file Excel.
   Nếu dùng chung một mã QR cho tất cả thì phải dò theo tên khách tự gõ,
   sai chính tả một chữ là lệch dòng.

   Danh sách khách KHÔNG được tải lên web — mỗi tờ thiệp chỉ mang đúng tên
   của người cầm nó, không ai tải về được cả danh sách. Số điện thoại và
   ghi chú thì không đưa vào mã. */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { encodeQR } from '../src/lib/qrcode.js'
import { qrToPngBuffer } from '../src/lib/pngEncode.js'
import { qrToSvgString } from '../src/lib/qrRender.js'
import { weddingConfig } from '../src/data/weddingConfig.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const GUESTS_JSON = join(ROOT, 'print', 'guests.json')
const OUT_DIR = join(ROOT, 'print', 'qr')

if (!existsSync(GUESTS_JSON)) {
  console.error('Chưa có print/guests.json. Chạy trước:')
  console.error('  python scripts/guests.py export')
  process.exit(1)
}

const guests = JSON.parse(readFileSync(GUESTS_JSON, 'utf8'))
if (!Array.isArray(guests) || guests.length === 0) {
  console.error('Danh sách khách rỗng.')
  process.exit(1)
}

const base = weddingConfig.siteUrl.replace(/\/+$/, '') + '/'
mkdirSync(OUT_DIR, { recursive: true })

const index = []

for (const guest of guests) {
  /* encodeURIComponent để tên có dấu tiếng Việt và chữ Nhật đi qua
     địa chỉ web an toàn. */
  const url =
    `${base}?g=${encodeURIComponent(guest.id)}` +
    `&n=${encodeURIComponent(guest.name)}#rsvp`

  /* EC level Q: chịu được khoảng 25% diện tích mã bị bẩn hay xước —
     mã sẽ nằm trên giấy dán vào thiệp nên dễ hỏng hơn trên màn hình. */
  const qr = encodeQR(url, { ec: 'Q' })
  const svg = qrToSvgString(qr, {
    quietZone: 4,
    width: 1000,
    dark: '#000000',
    light: '#FFFFFF',
    title: `Mã QR xác nhận tham dự — ${guest.name}`,
  })

  writeFileSync(join(OUT_DIR, `${guest.id}.svg`), svg, 'utf8')

  /* Kèm bản PNG: SVG đẹp cho nhà in nhưng nhiều máy và ứng dụng không mở
     được để xem trước, còn PNG thì ở đâu cũng mở được. */
  writeFileSync(join(OUT_DIR, `${guest.id}.png`), qrToPngBuffer(qr, { size: 1200 }))

  index.push({
    id: guest.id,
    name: guest.name,
    url,
    svg: `print/qr/${guest.id}.svg`,
    png: `print/qr/${guest.id}.png`,
  })
}

writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf8')

console.log(`Đã sinh ${index.length} mã QR (mỗi khách một SVG và một PNG) vào print/qr/`)
for (const item of index) {
  console.log(`  ${item.id}  ${item.name}  →  ${item.url}`)
}
