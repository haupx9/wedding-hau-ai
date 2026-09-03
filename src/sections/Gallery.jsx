import { useCallback, useEffect, useRef, useState } from 'react'

import FloralDivider from '../components/FloralDivider.jsx'
import { weddingConfig, ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './Gallery.css'

/* Mũi tên dùng chung cho nút trước/sau, xoay bằng CSS */
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Gallery() {
  const { t } = useLang()
  const { gallery } = weddingConfig

  /* null = lightbox đang đóng; số = vị trí ảnh đang xem */
  const [openIndex, setOpenIndex] = useState(null)
  const isOpen = openIndex !== null

  const closeButtonRef = useRef(null)
  /* Nhớ nút vừa bấm để khi đóng lightbox trả con trỏ về đúng chỗ cũ */
  const lastTriggerRef = useRef(null)

  const close = useCallback(() => setOpenIndex(null), [])

  const showPrev = useCallback(() => {
    setOpenIndex((index) => (index === null ? index : (index - 1 + gallery.length) % gallery.length))
  }, [gallery.length])

  const showNext = useCallback(() => {
    setOpenIndex((index) => (index === null ? index : (index + 1) % gallery.length))
  }, [gallery.length])

  /* Khi lightbox mở: khoá cuộn nền, bắt phím Esc / mũi tên trái phải,
     và đưa con trỏ bàn phím vào nút đóng. Tất cả gỡ bỏ khi đóng. */
  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowLeft') showPrev()
      else if (event.key === 'ArrowRight') showNext()
    }
    document.addEventListener('keydown', onKeyDown)

    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, close, showPrev, showNext])

  /* Đóng xong thì trả tiêu điểm về ảnh vừa xem */
  useEffect(() => {
    if (!isOpen && lastTriggerRef.current) {
      lastTriggerRef.current.focus()
      lastTriggerRef.current = null
    }
  }, [isOpen])

  const openAt = (index, event) => {
    lastTriggerRef.current = event.currentTarget
    setOpenIndex(index)
  }

  const current = isOpen ? gallery[openIndex] : null

  return (
    <section className="section gallery" id="gallery">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.gallery.eyebrow)}</p>
          <h2 className="section-title">{t(ui.gallery.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.gallery.lead)}</p>
        </div>

        <ul className="gallery__grid">
          {gallery.map((item, index) => (
            <li className="gallery__cell" key={item.src}>
              <button
                type="button"
                className="gallery__item reveal"
                onClick={(event) => openAt(index, event)}
                style={{ '--reveal-delay': `${(index % 3) * 0.1}s` }}
              >
                <img
                  className="gallery__image"
                  src={item.src}
                  alt={t(item.alt)}
                  /* Hai ảnh đầu nằm ngay trong tầm nhìn nên tải luôn,
                     các ảnh sau chờ khi cuộn tới mới tải cho nhẹ trang */
                  loading={index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <span className="gallery__overlay" aria-hidden="true">
                  <span className="gallery__overlay-text">
                    {t(ui.gallery.open)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ---------- Lightbox tự viết, không dùng thư viện ---------- */}
      {isOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t(ui.gallery.title)}
          /* Bấm ra vùng nền tối thì đóng, bấm trúng ảnh thì không */
          onClick={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <button
            type="button"
            className="lightbox__btn lightbox__close"
            onClick={close}
            ref={closeButtonRef}
            aria-label={t(ui.gallery.close)}
          >
            <CloseIcon />
          </button>

          <button
            type="button"
            className="lightbox__btn lightbox__nav lightbox__nav--prev"
            onClick={showPrev}
            aria-label={t(ui.gallery.prev)}
          >
            <ArrowIcon />
          </button>

          <figure className="lightbox__figure">
            <img
              className="lightbox__image"
              /* key ép React thay hẳn thẻ img để hiệu ứng mờ dần chạy lại */
              key={current.src}
              src={current.src}
              alt={t(current.alt)}
            />
            <figcaption className="lightbox__caption">
              <span className="lightbox__alt">{t(current.alt)}</span>
              <span className="lightbox__counter">
                <span className="visually-hidden">{t(ui.gallery.counter)} </span>
                {openIndex + 1} / {gallery.length}
              </span>
            </figcaption>
          </figure>

          <button
            type="button"
            className="lightbox__btn lightbox__nav lightbox__nav--next"
            onClick={showNext}
            aria-label={t(ui.gallery.next)}
          >
            <ArrowIcon />
          </button>
        </div>
      )}
    </section>
  )
}
