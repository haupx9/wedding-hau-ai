import { useEffect, useRef, useState } from 'react'

import FloralDivider from '../components/FloralDivider.jsx'
import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './Gift.css'

/* Icon phong bì nhỏ đặt trên đầu mỗi thẻ */
function EnvelopeIcon() {
  return (
    <svg
      className="gift__mark"
      viewBox="0 0 48 36"
      width="42"
      height="32"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="34"
        rx="2"
        stroke="var(--gold)"
        strokeWidth="1"
      />
      <path
        d="M1.5 2.5 24 20 46.5 2.5"
        stroke="var(--gold)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <g transform="translate(24 24)">
        <g fill="var(--rose)" opacity="0.8">
          <ellipse cx="0" cy="-3.4" rx="1.7" ry="2.6" />
          <ellipse cx="0" cy="3.4" rx="1.7" ry="2.6" />
          <ellipse cx="-3.4" cy="0" rx="2.6" ry="1.7" />
          <ellipse cx="3.4" cy="0" rx="2.6" ry="1.7" />
        </g>
        <circle r="1.5" fill="var(--gold)" />
      </g>
    </svg>
  )
}

/* Sao chép chuỗi vào bộ nhớ tạm.
   Ưu tiên Clipboard API; trình duyệt cũ hoặc trang chạy qua http
   thì lùi về cách cũ: tạo ô nhập ẩn rồi gọi execCommand('copy'). */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* Bị từ chối quyền thì thử tiếp cách dự phòng bên dưới */
  }

  try {
    const helper = document.createElement('textarea')
    helper.value = text
    helper.setAttribute('readonly', '')
    /* Đặt ngoài màn hình để người dùng không thấy ô nhập nhấp nháy */
    helper.style.position = 'fixed'
    helper.style.top = '-1000px'
    helper.style.opacity = '0'
    document.body.appendChild(helper)
    helper.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(helper)
    return ok
  } catch {
    return false
  }
}

export default function Gift() {
  const { t } = useLang()
  const { gift } = weddingConfig

  /* Id của thẻ vừa sao chép xong, dùng để đổi nhãn nút trong 2 giây */
  const [copiedId, setCopiedId] = useState(null)
  const timerRef = useRef(null)

  /* Xoá hẹn giờ khi rời trang, tránh gọi setState trên component đã gỡ */
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleCopy = async (account) => {
    const ok = await copyText(account.number)
    if (!ok) return

    setCopiedId(account.id)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <section className="section section--tinted gift" id="gift">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.gift.eyebrow)}</p>
          <h2 className="section-title">{t(ui.gift.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.gift.lead)}</p>
        </div>

        <ul className="gift__grid">
          {gift.accounts.map((account, index) => (
            <li
              key={account.id}
              className="gift__card reveal"
              style={{ '--reveal-delay': `${index * 0.12}s` }}
            >
              <EnvelopeIcon />
              <h3 className="gift__side">{t(account.side)}</h3>

              {/* Ô mã QR: chưa có ảnh thì hiện khung nét đứt chờ cập nhật */}
              {account.qr ? (
                <img
                  className="gift__qr"
                  src={account.qr}
                  alt={`${t(ui.gift.qrAlt)} — ${t(account.owner)}`}
                  loading="lazy"
                />
              ) : (
                <div className="gift__qr-pending">
                  <span>{t(ui.gift.qrPending)}</span>
                </div>
              )}

              <dl className="gift__info">
                <dt>{t(ui.gift.ownerLabel)}</dt>
                <dd>{t(account.owner)}</dd>

                <dt>{t(ui.gift.bankLabel)}</dt>
                <dd>{t(account.bank)}</dd>

                <dt>{t(ui.gift.accountNumber)}</dt>
                <dd className="gift__number">
                  {account.number || t(ui.gift.pending)}
                </dd>
              </dl>

              {/* Chưa có số thật thì không hiện nút sao chép — để tránh khách
                  sao chép rồi chuyển tiền vào một con số vô nghĩa. */}
              {account.number && (
                <button
                  type="button"
                  className="btn btn--outline gift__copy"
                  onClick={() => handleCopy(account)}
                >
                  {t(copiedId === account.id ? ui.gift.copied : ui.gift.copy)}
                </button>
              )}

              {/* Thông báo cho trình đọc màn hình biết đã sao chép xong */}
              <span className="visually-hidden" role="status">
                {copiedId === account.id ? t(ui.gift.copied) : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
