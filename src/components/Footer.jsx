import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import FloralDivider from './FloralDivider.jsx'
import './Footer.css'

/* Bỏ dấu cách trong số điện thoại để link tel: bấm là gọi được ngay */
function telHref(phone) {
  return `tel:${phone.replace(/\s+/g, '')}`
}

export default function Footer() {
  const { t } = useLang()
  const { couple, contact } = weddingConfig

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__thanks">{t(ui.footer.thanks)}</p>

        <p className="footer__names">
          {t(couple.groom.shortName)}
          <span className="footer__amp" aria-hidden="true">
            {' & '}
          </span>
          {t(couple.bride.shortName)}
        </p>

        <FloralDivider />

        <p className="footer__hashtag">{couple.hashtag}</p>

        <div className="footer__contact">
          <h2 className="footer__contact-title">{t(ui.footer.contactTitle)}</h2>
          <ul className="footer__contact-list">
            {contact.map((person) => (
              <li className="footer__contact-item" key={t(person.label)}>
                <span className="footer__contact-role">{t(person.label)}</span>
                <span className="footer__contact-name">{t(person.name)}</span>
                {/* Chưa có số thật thì không hiện gì — thà thiếu còn hơn để
                    khách bấm gọi vào số của người lạ. */}
                {person.phone && (
                  <a className="footer__contact-phone" href={telHref(person.phone)}>
                    {person.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <p className="footer__meta">
          {t(ui.footer.madeWith)}
          <span className="footer__dot" aria-hidden="true">
            ·
          </span>
          {t(ui.hero.dateLine)}
        </p>

        <a className="footer__top" href="#home">
          {t(ui.footer.backToTop)}
        </a>
      </div>
    </footer>
  )
}
