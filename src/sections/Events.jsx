import FloralDivider from '../components/FloralDivider.jsx'
import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './Events.css'

/* Icon đồng hồ — vẽ tay bằng SVG, không tải icon font */
function ClockIcon() {
  return (
    <svg
      className="events__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M12 7.4V12l3.1 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Icon ghim địa điểm */
function PinIcon() {
  return (
    <svg
      className="events__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 21c4.2-4.6 6.3-8 6.3-10.6A6.3 6.3 0 0 0 5.7 10.4C5.7 13 7.8 16.4 12 21Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.3" r="2.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export default function Events() {
  const { t } = useLang()
  const { events, images } = weddingConfig

  return (
    <section className="section events" id="events">
      {/* Ảnh nền phủ lớp kem mờ để chữ trên thẻ vẫn đọc rõ */}
      <div
        className="events__bg"
        style={{ backgroundImage: `url(${images.eventsBackground})` }}
        aria-hidden="true"
      />
      <div className="events__veil" aria-hidden="true" />

      <div className="container events__inner">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.events.eyebrow)}</p>
          <h2 className="section-title">{t(ui.events.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.events.lead)}</p>
        </div>

        <ul className="events__grid">
          {events.map((event, index) => (
            <li
              key={event.id}
              className="events__card reveal"
              style={{ '--reveal-delay': `${index * 0.12}s` }}
            >
              <h3 className="events__title">{t(event.title)}</h3>
              <span className="events__rule" aria-hidden="true" />

              <p className="events__row">
                <ClockIcon />
                <span className="visually-hidden">
                  {t(ui.events.timeLabel)}:{' '}
                </span>
                <span className="events__time">{t(event.time)}</span>
              </p>

              <p className="events__row">
                <PinIcon />
                <span className="visually-hidden">
                  {t(ui.events.venueLabel)}:{' '}
                </span>
                <span>
                  <span className="events__venue">{t(event.venue)}</span>
                  <span className="events__address">{t(event.address)}</span>
                </span>
              </p>

              <p className="events__note">
                <span className="visually-hidden">
                  {t(ui.events.noteLabel)}:{' '}
                </span>
                {t(event.note)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
