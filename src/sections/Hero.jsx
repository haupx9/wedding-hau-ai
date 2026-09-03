import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './Hero.css'

/* Góc hoa trang trí — vẽ bằng SVG, lật/xoay để dùng lại cho 4 góc */
function FloralCorner({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      {/* Cành cong chính */}
      <path
        d="M4 4C4 62 26 108 70 138c28 19 62 30 96 34"
        stroke="var(--sage)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Cành phụ ngắn hơn, tạo chiều sâu */}
      <path
        d="M4 34c6 42 28 76 62 98"
        stroke="var(--sage)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Lá mọc dọc theo cành */}
      <g fill="var(--sage)" opacity="0.6">
        <ellipse cx="20" cy="46" rx="5" ry="11" transform="rotate(-32 20 46)" />
        <ellipse cx="34" cy="76" rx="5" ry="12" transform="rotate(-22 34 76)" />
        <ellipse cx="56" cy="104" rx="5" ry="12" transform="rotate(-8 56 104)" />
        <ellipse cx="88" cy="128" rx="12" ry="5" transform="rotate(12 88 128)" />
        <ellipse cx="122" cy="146" rx="12" ry="5" transform="rotate(6 122 146)" />
      </g>

      {/* Ba bông hoa với kích thước khác nhau cho tự nhiên */}
      <g opacity="0.9">
        <g transform="translate(46 22) scale(1.15)">
          <g fill="var(--blush-200)">
            <ellipse cx="0" cy="-7" rx="3.6" ry="5.6" />
            <ellipse cx="0" cy="7" rx="3.6" ry="5.6" />
            <ellipse cx="-7" cy="0" rx="5.6" ry="3.6" />
            <ellipse cx="7" cy="0" rx="5.6" ry="3.6" />
          </g>
          <circle r="3.2" fill="var(--gold)" />
        </g>

        <g transform="translate(96 96)">
          <g fill="var(--rose)" opacity="0.72">
            <ellipse cx="0" cy="-7" rx="3.6" ry="5.6" />
            <ellipse cx="0" cy="7" rx="3.6" ry="5.6" />
            <ellipse cx="-7" cy="0" rx="5.6" ry="3.6" />
            <ellipse cx="7" cy="0" rx="5.6" ry="3.6" />
          </g>
          <circle r="3" fill="var(--gold)" />
        </g>

        <g transform="translate(160 160) scale(0.85)">
          <g fill="var(--blush-200)">
            <ellipse cx="0" cy="-7" rx="3.6" ry="5.6" />
            <ellipse cx="0" cy="7" rx="3.6" ry="5.6" />
            <ellipse cx="-7" cy="0" rx="5.6" ry="3.6" />
            <ellipse cx="7" cy="0" rx="5.6" ry="3.6" />
          </g>
          <circle r="3.2" fill="var(--gold)" />
        </g>
      </g>
    </svg>
  )
}

export default function Hero() {
  const { t } = useLang()
  const { couple, images } = weddingConfig

  return (
    <section className="hero" id="home">
      {/* Ảnh nền: dùng thẻ img thật thay vì background-image để trình duyệt
          ưu tiên tải sớm và để đọc được kích thước ảnh cho SEO. */}
      <div className="hero__media">
        <img
          className="hero__image"
          src={images.hero}
          alt=""
          fetchpriority="high"
        />
        <div className="hero__scrim" />
      </div>

      <FloralCorner className="hero__corner hero__corner--tl" />
      <FloralCorner className="hero__corner hero__corner--br" />

      <div className="hero__content">
        <p className="hero__eyebrow">{t(ui.hero.eyebrow)}</p>

        <h1 className="hero__names">
          <span className="hero__name">{t(couple.groom.shortName)}</span>
          <span className="hero__amp" aria-hidden="true">
            &amp;
          </span>
          <span className="hero__name">{t(couple.bride.shortName)}</span>
        </h1>

        <p className="hero__tagline">{t(ui.hero.weAreGettingMarried)}</p>

        <div className="hero__rule" aria-hidden="true">
          <span />
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <g transform="translate(9 9)">
              <g fill="var(--white)" opacity="0.9">
                <ellipse cx="0" cy="-4" rx="2" ry="3.2" />
                <ellipse cx="0" cy="4" rx="2" ry="3.2" />
                <ellipse cx="-4" cy="0" rx="3.2" ry="2" />
                <ellipse cx="4" cy="0" rx="3.2" ry="2" />
              </g>
              <circle r="1.7" fill="var(--gold)" />
            </g>
          </svg>
          <span />
        </div>

        <p className="hero__date">{t(ui.hero.dateLine)}</p>
      </div>

      <a className="hero__scroll" href="#countdown">
        <span className="hero__scroll-text">{t(ui.hero.scroll)}</span>
        <span className="hero__scroll-line" aria-hidden="true" />
      </a>
    </section>
  )
}
