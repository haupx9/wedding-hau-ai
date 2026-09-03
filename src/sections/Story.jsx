import FloralDivider from '../components/FloralDivider.jsx'
import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './Story.css'

export default function Story() {
  const { t } = useLang()
  const { story } = weddingConfig

  return (
    <section className="section section--tinted story" id="story">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.story.eyebrow)}</p>
          <h2 className="section-title">{t(ui.story.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.story.lead)}</p>
        </div>

        {/* Đường kẻ dọc nằm ở giữa (desktop) hoặc sát trái (mobile),
            vẽ bằng ::before của chính danh sách này */}
        <ol className="story__timeline">
          {story.map((item, index) => (
            <li
              key={item.id}
              className={`story__item reveal${
                index % 2 === 1 ? ' story__item--flip' : ''
              }`}
            >
              {/* Chấm tròn nằm trên đường kẻ, đánh dấu từng cột mốc */}
              <span className="story__dot" aria-hidden="true" />

              <div className="story__media">
                <img
                  className="story__image"
                  src={item.image}
                  alt=""
                  loading="lazy"
                />
              </div>

              <div className="story__body">
                <p className="story__date">{t(item.date)}</p>
                <h3 className="story__title">{t(item.title)}</h3>
                <p className="story__text">{t(item.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
