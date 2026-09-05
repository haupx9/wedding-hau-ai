/* Sinh file mã QR để đưa nhà in: print/qr-invite.svg
   Chạy:  node scripts/make-print-qr.mjs

   Dùng EC level Q (chịu được ~25% diện tích mã bị bẩn/mờ/che) vì mã sẽ
   in lên giấy rồi dán lên thiệp, dễ xước hoặc dính mực hơn màn hình. */

import { writeFileSync } from 'node:fs'
import { encodeQR } from '../src/lib/qrcode.js'
import { qrToPngBuffer } from '../src/lib/pngEncode.js'
import { qrToSvgString } from '../src/lib/qrRender.js'

const TARGET = 'https://haupx9.github.io/wedding-hau-ai/#rsvp'
const OUT = new URL('../print/qr-invite.svg', import.meta.url)

const qr = encodeQR(TARGET, { ec: 'Q' })
const svg = qrToSvgString(qr, {
  quietZone: 4,
  width: 1000,
  dark: '#000000',
  light: '#FFFFFF',
  title: 'Mã QR xác nhận tham dự lễ cưới Hậu & Ai',
})

writeFileSync(OUT, svg, 'utf8')
writeFileSync(new URL('../print/qr-invite.png', import.meta.url), qrToPngBuffer(qr, { size: 1200 }))
console.log(`Đã tạo print/qr-invite.svg — version ${(qr.size - 17) / 4}, ${qr.size}x${qr.size} ô`)
console.log(`Nội dung mã: ${TARGET}`)
