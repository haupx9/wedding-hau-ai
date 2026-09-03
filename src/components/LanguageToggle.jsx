import { ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './LanguageToggle.css'

/* Nút đổi ngôn ngữ dạng hai nhãn "VI | 日本語".
   Nhãn đang chọn được tô nổi và mang aria-pressed="true" để trình
   đọc màn hình biết đây là trạng thái đang bật. */
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLang()

  return (
    <div
      className={`lang-toggle ${className}`.trim()}
      role="group"
      aria-label={t(ui.language.label)}
    >
      <button
        type="button"
        className={`lang-toggle__btn${lang === 'vi' ? ' is-active' : ''}`}
        onClick={() => setLang('vi')}
        aria-pressed={lang === 'vi'}
        lang="vi"
      >
        <span aria-hidden="true">{t(ui.language.viShort)}</span>
        <span className="visually-hidden">{t(ui.language.vi)}</span>
      </button>

      <span className="lang-toggle__sep" aria-hidden="true" />

      <button
        type="button"
        className={`lang-toggle__btn${lang === 'ja' ? ' is-active' : ''}`}
        onClick={() => setLang('ja')}
        aria-pressed={lang === 'ja'}
        lang="ja"
      >
        <span aria-hidden="true">{t(ui.language.jaShort)}</span>
        <span className="visually-hidden">{t(ui.language.ja)}</span>
      </button>
    </div>
  )
}
