import FloralDivider from '../components/FloralDivider.jsx'
import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './MapSection.css'

export default function MapSection() {
  const { t } = useLang()
  const { map } = weddingConfig
  const { lat, lng, bboxDelta } = map

  /* Khung nhìn của bản đồ: một hình chữ nhật quanh toạ độ địa điểm.
     bboxDelta càng nhỏ thì bản đồ càng phóng to. */
  const bbox = [lng - bboxDelta, lat - bboxDelta, lng + bboxDelta, lat + bboxDelta].join(',')

  /* OpenStreetMap: nhúng thẳng bằng iframe, không cần khoá API
     và không cài mã theo dõi người dùng lên trang. */
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`

  /* Nút chỉ đường mở Google Maps để khách dùng được điều hướng từng chặng */
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  return (
    <section className="section section--tinted map" id="map">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.map.eyebrow)}</p>
          <h2 className="section-title">{t(ui.map.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.map.lead)}</p>
        </div>

        <div className="map__layout">
          <div className="map__frame reveal">
            <iframe
              className="map__iframe"
              src={embedSrc}
              title={t(ui.map.mapTitle)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="map__info reveal" style={{ '--reveal-delay': '0.12s' }}>
            <h3 className="map__venue">{t(map.venueName)}</h3>
            <span className="map__rule" aria-hidden="true" />
            <p className="map__address">{t(map.address)}</p>

            <a
              className="btn btn--solid map__cta"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t(ui.map.directions)}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
