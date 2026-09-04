/* ============================================================
   MÃ QR DẪN TỚI PHẦN XÁC NHẬN THAM DỰ
   ------------------------------------------------------------
   Mã này được in ra rồi dán lên thiệp cưới giấy. Khách quét bằng
   camera điện thoại là vào thẳng mục "Xác nhận tham dự" của website.

   Toàn bộ mã QR được sinh ngay trên máy khách bằng mã tự viết
   (src/lib/qrcode.js + src/lib/qrRender.js) — không gọi dịch vụ
   sinh QR bên ngoài, nên không lộ thông tin và không phụ thuộc
   vào một trang web nào có thể chết trong tương lai.
   ============================================================ */

import { useMemo, useState } from 'react'

import { ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import { encodeQR } from '../lib/qrcode.js'
import { qrToPngDataUrl, qrToSvgString } from '../lib/qrRender.js'
import FloralDivider from './FloralDivider.jsx'
import './InviteQR.css'

/* Địa chỉ mã QR trỏ tới. Dấu #rsvp đưa khách xuống đúng phần
   xác nhận tham dự thay vì phải tự cuộn tìm. */
export const RSVP_QR_URL = 'https://haupx9.github.io/wedding-hau-ai/#rsvp'

/* Tên file khi khách bấm tải về — đặt tiếng Việt không dấu cho
   an toàn với mọi hệ điều hành và máy in. */
const FILE_BASE = 'ma-qr-xac-nhan-tham-du'

/* Kích thước ảnh PNG xuất ra (px). 1200px in cỡ 4cm vẫn rất nét. */
const PNG_SIZE = 1200

/* Tạo thẻ <a download> ẩn rồi bấm hộ, đây là cách tải file
   không cần server. Xoá thẻ ngay sau đó cho sạch DOM. */
function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function InviteQR() {
  const { t } = useLang()

  /* Báo lỗi khi bấm tải về không thành công (trình duyệt quá cũ,
     chặn Blob, hết bộ nhớ khi vẽ canvas...) */
  const [downloadError, setDownloadError] = useState(false)

  /* Mã hoá một lần duy nhất rồi nhớ lại: nội dung mã không đổi
     theo ngôn ngữ nên không cần tính lại khi khách bấm VI/日本語. */
  const { qr, svg, error } = useMemo(() => {
    try {
      /* Mức sửa lỗi M chịu được khoảng 15% diện tích mã bị bẩn,
         mực lem hay giấy xước — đủ an toàn cho thiệp in. */
      const encoded = encodeQR(RSVP_QR_URL, { ec: 'M' })
      return {
        qr: encoded,
        svg: qrToSvgString(encoded, { quietZone: 4 }),
        error: null,
      }
    } catch (err) {
      /* Không để lỗi làm trắng cả trang: ghi log cho người phát triển,
         còn khách chỉ thấy một dòng thông báo nhẹ nhàng. */
      console.error('Không tạo được mã QR:', err)
      return { qr: null, svg: '', error: err }
    }
  }, [])

  /* Nhúng SVG thẳng vào thẻ <img> dưới dạng data URL.
     Cách này giữ được độ nét vector mà vẫn có thuộc tính alt
     cho trình đọc màn hình. */
  const previewSrc = useMemo(
    () =>
      svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '',
    [svg],
  )

  const handleDownloadSvg = () => {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, `${FILE_BASE}.svg`)
      /* Chờ trình duyệt bắt đầu tải xong rồi mới thu hồi địa chỉ tạm */
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      setDownloadError(false)
    } catch (err) {
      console.error('Không tải được file SVG:', err)
      setDownloadError(true)
    }
  }

  const handleDownloadPng = () => {
    try {
      const dataUrl = qrToPngDataUrl(qr, { size: PNG_SIZE, quietZone: 4 })
      triggerDownload(dataUrl, `${FILE_BASE}.png`)
      setDownloadError(false)
    } catch (err) {
      console.error('Không tải được file PNG:', err)
      setDownloadError(true)
    }
  }

  const hasQr = Boolean(qr && svg && !error)

  return (
    <section className="section invite-qr" id="invite-qr">
      <div className="container">
        <div className="section-head reveal">
          <h2 className="section-title">{t(ui.qr.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.qr.hint)}</p>
        </div>

        <div className="invite-qr__card reveal">
          {hasQr ? (
            <div className="invite-qr__frame">
              <img
                className="invite-qr__image"
                src={previewSrc}
                alt={t(ui.qr.title)}
                width="260"
                height="260"
              />
            </div>
          ) : (
            /* Mã hoá thất bại: báo một dòng thay vì để trắng cả phần này.
               Đường dẫn bên dưới vẫn hiện để khách tự mở bằng tay. */
            <p className="invite-qr__error" role="status">
              {t(ui.qr.error)}
            </p>
          )}

          <a
            className="invite-qr__link"
            href={RSVP_QR_URL}
            target="_blank"
            rel="noreferrer"
          >
            {RSVP_QR_URL}
          </a>

          {hasQr ? (
            <>
              <div className="invite-qr__actions">
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={handleDownloadSvg}
                >
                  {t(ui.qr.downloadSvg)}
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleDownloadPng}
                >
                  {t(ui.qr.downloadPng)}
                </button>
              </div>

              {/* Chỉ hiện khi bấm tải mà không thành công */}
              {downloadError ? (
                <p className="invite-qr__error" role="status">
                  {t(ui.qr.error)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}
