import { useEffect, useState } from 'react'

import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import LanguageToggle from './LanguageToggle.jsx'
import './Navbar.css'

/* Danh sách mục menu: `id` phải khớp với id của section tương ứng
   thì bấm vào mới cuộn đúng chỗ. */
const MENU = [
  { id: 'story', label: ui.nav.story },
  { id: 'gallery', label: ui.nav.gallery },
  { id: 'events', label: ui.nav.events },
  { id: 'map', label: ui.nav.map },
  { id: 'rsvp', label: ui.nav.rsvp },
]

export default function Navbar() {
  const { t } = useLang()
  const { couple } = weddingConfig

  /* Cuộn quá 80px thì thanh menu đổi sang nền kem để chữ đọc rõ */
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll() // chạy ngay một lần phòng khi trang mở ra đã ở giữa chừng
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Khi panel mobile mở: khoá cuộn nền và cho phép bấm Esc để đóng.
     Cả hai việc đều phải dọn dẹp trong cleanup, nếu không trang sẽ
     kẹt không cuộn được sau khi đóng menu. */
  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  /* Chuyển từ mobile sang desktop khi panel đang mở thì đóng lại,
     tránh trường hợp nền vẫn bị khoá cuộn mà không thấy panel đâu. */
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)')
    const onChange = (event) => {
      if (event.matches) setMenuOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const coupleName = `${t(couple.groom.shortName)} & ${t(couple.bride.shortName)}`

  return (
    <header className={`nav${scrolled ? ' nav--solid' : ''}`}>
      <div className="nav__inner container">
        <a className="nav__brand" href="#home" onClick={() => setMenuOpen(false)}>
          {coupleName}
        </a>

        {/* Menu ngang cho màn hình rộng */}
        <nav className="nav__desktop" aria-label={t(ui.nav.label)}>
          <ul className="nav__list">
            {MENU.map((item) => (
              <li key={item.id}>
                <a className="nav__link" href={`#${item.id}`}>
                  {t(item.label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions">
          <LanguageToggle className="nav__lang" />

          <button
            type="button"
            className={`nav__burger${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="nav-panel"
            aria-label={t(menuOpen ? ui.nav.closeMenu : ui.nav.openMenu)}
          >
            <span className="nav__burger-bar" aria-hidden="true" />
            <span className="nav__burger-bar" aria-hidden="true" />
            <span className="nav__burger-bar" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Lớp nền mờ phía sau panel: bấm ra ngoài cũng đóng menu */}
      <div
        className={`nav__backdrop${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Panel trượt từ phải sang, chỉ dùng trên mobile.
          Luôn nằm trong DOM để có hiệu ứng trượt mượt; khi đóng thì
          gắn inert/hidden bằng cách bỏ khỏi thứ tự tab qua CSS + aria. */}
      <nav
        id="nav-panel"
        className={`nav__panel${menuOpen ? ' is-open' : ''}`}
        aria-label={t(ui.nav.label)}
        aria-hidden={!menuOpen}
      >
        <ul className="nav__panel-list">
          <li>
            <a
              className="nav__panel-link"
              href="#home"
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
            >
              {t(ui.nav.home)}
            </a>
          </li>
          {MENU.map((item) => (
            <li key={item.id}>
              <a
                className="nav__panel-link"
                href={`#${item.id}`}
                onClick={() => setMenuOpen(false)}
                tabIndex={menuOpen ? 0 : -1}
              >
                {t(item.label)}
              </a>
            </li>
          ))}
        </ul>

        {/* Chỉ dựng nút đổi ngôn ngữ khi panel mở, để lúc đóng không
            còn nút nào bấm Tab lọt vào được vùng đang bị ẩn */}
        {menuOpen && <LanguageToggle className="nav__panel-lang" />}
      </nav>
    </header>
  )
}
