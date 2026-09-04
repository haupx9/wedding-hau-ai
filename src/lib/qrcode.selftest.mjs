/* Tự kiểm chứng bộ tạo mã QR: encode rồi decode lại, so với chuỗi gốc.
   Vì không dùng thư viện ngoài nào để đối chiếu, bộ giải mã độc lập
   trong qrcode.decode.js chính là cách duy nhất để tin bộ encode viết đúng chuẩn.

   Chạy:  node src/lib/qrcode.selftest.mjs  */

import { encodeQR } from './qrcode.js'
import { decodeQR } from './qrcode.decode.js'

const SITE = 'https://haupx9.github.io/wedding-hau-ai/'

const cases = [
  ['URL thiệp mời (dùng in QR)', SITE + '#rsvp'],
  ['URL trang chủ', SITE],
  ['Chuỗi rỗng', ''],
  ['Tiếng Việt có dấu', 'Xin chào các bạn! Mời bạn đến dự lễ cưới của Hậu & Ai'],
  ['Tiếng Nhật', 'ハウと亜衣の結婚式にご招待いたします'],
  ['Chuỗi dài (ép version cao)', (SITE + '#rsvp ').repeat(9).trim()],
]

let failed = 0

for (const ec of ['M', 'Q']) {
  for (const [label, text] of cases) {
    let line = `[EC ${ec}] ${label}`
    try {
      const qr = encodeQR(text, { ec })
      const result = decodeQR(qr.modules)
      const info = `version ${result.version}, size ${qr.size}, mask ${result.mask}, EC ${result.ec}`

      if (result.text === text) {
        console.log(`PASS  ${line} — ${info}`)
      } else {
        failed++
        console.log(`FAIL  ${line} — ${info}`)
        console.log(`      gốc    : ${JSON.stringify(text)}`)
        console.log(`      giải mã: ${JSON.stringify(result.text)}`)
      }
    } catch (err) {
      failed++
      console.log(`FAIL  ${line} — ném lỗi: ${err && err.message}`)
    }
  }
}

console.log(failed === 0 ? '\nTẤT CẢ TEST PASS' : `\n${failed} TEST FAIL`)
process.exit(failed === 0 ? 0 : 1)
