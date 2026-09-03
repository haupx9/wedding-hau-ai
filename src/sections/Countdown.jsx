import { useEffect, useState } from 'react'

import FloralDivider from '../components/FloralDivider.jsx'
import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './Countdown.css'

const TARGET = new Date(weddingConfig.weddingDate).getTime()

/* Tính số ngày/giờ/phút/giây còn lại tính từ bây giờ.
   `finished` bật lên khi đã qua thời điểm cưới, lúc đó ta hiện lời
   chúc mừng thay vì hiện số âm. */
function getRemaining() {
  const diff = TARGET - Date.now()

  if (!Number.isFinite(diff) || diff <= 0) {
    return { finished: true, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const totalSeconds = Math.floor(diff / 1000)

  return {
    finished: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/* Thêm số 0 phía trước cho đẹp: 7 -> "07". Riêng số ngày có thể
   lên tới ba chữ số nên không cắt bớt. */
function pad(value) {
  return String(value).padStart(2, '0')
}

export default function Countdown() {
  const { t } = useLang()
  const [remaining, setRemaining] = useState(getRemaining)

  useEffect(() => {
    /* Nếu đã qua ngày cưới thì không cần chạy đồng hồ nữa */
    if (remaining.finished) return

    const timer = setInterval(() => {
      setRemaining(getRemaining())
    }, 1000)

    /* Dọn dẹp: bắt buộc phải xoá interval, nếu không mỗi lần
       component dựng lại sẽ để lại một đồng hồ chạy nền */
    return () => clearInterval(timer)
  }, [remaining.finished])

  const boxes = [
    { key: 'days', label: ui.countdown.days, value: remaining.days },
    { key: 'hours', label: ui.countdown.hours, value: pad(remaining.hours) },
    { key: 'minutes', label: ui.countdown.minutes, value: pad(remaining.minutes) },
    { key: 'seconds', label: ui.countdown.seconds, value: pad(remaining.seconds) },
  ]

  return (
    <section className="section countdown" id="countdown">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.countdown.eyebrow)}</p>
          <h2 className="section-title">{t(ui.countdown.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.countdown.lead)}</p>
        </div>

        {remaining.finished ? (
          <p className="countdown__finished reveal">
            {t(ui.countdown.finished)}
          </p>
        ) : (
          /* aria-live="off": số giây nhảy liên tục, nếu để trình đọc
             màn hình đọc từng nhịp thì rất khó chịu cho người dùng */
          <ul className="countdown__grid" aria-live="off">
            {boxes.map((box, index) => (
              <li
                key={box.key}
                className="countdown__box reveal"
                style={{ '--reveal-delay': `${index * 0.08}s` }}
              >
                <span className="countdown__value">{box.value}</span>
                <span className="countdown__label">{t(box.label)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="countdown__date reveal">{t(ui.hero.dateLine)}</p>
      </div>
    </section>
  )
}
