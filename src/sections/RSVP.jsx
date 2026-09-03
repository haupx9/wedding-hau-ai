import { useState } from 'react'

import FloralDivider from '../components/FloralDivider.jsx'
import { ui } from '../data/weddingConfig.js'
import { useLang } from '../i18n/LanguageContext.jsx'
import './RSVP.css'

/* Khoá lưu trong localStorage. Bản demo này giữ phản hồi ngay trên
   máy khách, chưa gửi đi đâu cả. */
const STORAGE_KEY = 'wedding-rsvp'

const EMPTY_FORM = {
  name: '',
  phone: '',
  attending: 'yes',
  guests: '1',
  side: 'groom',
  message: '',
}

/* Đọc danh sách phản hồi đã lưu. Ở chế độ ẩn danh hoặc khi trình duyệt
   chặn localStorage thì trả về mảng rỗng thay vì làm vỡ trang. */
function readSaved() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function RSVP() {
  const { t } = useLang()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  /* null = chưa gửi; 'yes' | 'no' = đã gửi, dùng để chọn lời cảm ơn */
  const [submittedAs, setSubmittedAs] = useState(null)

  const update = (field) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [field]: value }))
    /* Gõ lại thì xoá lỗi cũ của đúng ô đó cho đỡ khó chịu */
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  /* Kiểm tra phía trình duyệt trước khi lưu */
  const validate = () => {
    const found = {}

    if (!form.name.trim()) {
      found.name = t(ui.rsvp.errorName)
    }

    /* Đếm số chữ số thật sự, bỏ qua dấu cách, gạch ngang, dấu ngoặc */
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 9) {
      found.phone = t(ui.rsvp.errorPhone)
    }

    return found
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      /* Đưa con trỏ về ô lỗi đầu tiên để người dùng sửa ngay */
      const firstField = Object.keys(found)[0]
      document.getElementById(`rsvp-${firstField}`)?.focus()
      return
    }

    const entry = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      message: form.message.trim(),
      /* Người không tham dự thì số người luôn là 0 */
      guests: form.attending === 'yes' ? Number(form.guests) : 0,
      savedAt: new Date().toISOString(),
    }

    /* ==========================================================
       NỐI BACKEND THẬT Ở ĐÂY
       ----------------------------------------------------------
       Hiện tại phản hồi chỉ được ghi vào localStorage của trình duyệt.
       Khi có máy chủ (hoặc Google Form / Sheet / Firebase...), thay
       đoạn lưu bên dưới bằng lời gọi mạng, ví dụ:

           await fetch('https://mien-cua-ban/api/rsvp', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(entry),
           })

       Nhớ chuyển handleSubmit thành hàm async, thêm trạng thái
       "đang gửi" (đã có sẵn chữ ui.rsvp.submitting) và xử lý lỗi mạng.
       ========================================================== */
    try {
      const saved = readSaved()
      saved.push(entry)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      /* Không lưu được (chế độ ẩn danh, hết dung lượng...) thì vẫn
         hiện lời cảm ơn — khách không cần biết chuyện kỹ thuật này. */
    }

    setSubmittedAs(form.attending)
  }

  /* Bấm "gửi phản hồi khác": xoá trắng form và quay lại màn nhập */
  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmittedAs(null)
  }

  return (
    <section className="section rsvp" id="rsvp">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">{t(ui.rsvp.eyebrow)}</p>
          <h2 className="section-title">{t(ui.rsvp.title)}</h2>
          <FloralDivider />
          <p className="lead">{t(ui.rsvp.lead)}</p>
        </div>

        <div className="rsvp__panel">
          {submittedAs ? (
            /* ---------- Màn hình cảm ơn ---------- */
            <div className="rsvp__thanks" role="status">
              <svg
                className="rsvp__thanks-mark"
                viewBox="0 0 64 64"
                width="64"
                height="64"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  stroke="var(--gold)"
                  strokeWidth="1"
                  opacity="0.7"
                />
                <path
                  d="M32 44c-8-6-13-11-13-16.4A6.6 6.6 0 0 1 32 24a6.6 6.6 0 0 1 13 3.6C45 33 40 38 32 44Z"
                  fill="var(--rose)"
                  opacity="0.85"
                />
              </svg>

              <h3 className="rsvp__thanks-title">{t(ui.rsvp.successTitle)}</h3>
              <p className="rsvp__thanks-text">
                {t(submittedAs === 'yes' ? ui.rsvp.successYes : ui.rsvp.successNo)}
              </p>

              <button
                type="button"
                className="btn btn--outline"
                onClick={resetForm}
              >
                {t(ui.rsvp.sendAnother)}
              </button>
            </div>
          ) : (
            /* ---------- Biểu mẫu ---------- */
            <form className="rsvp__form" onSubmit={handleSubmit} noValidate>
              {/* Họ và tên */}
              <div className="rsvp__field">
                <label className="rsvp__label" htmlFor="rsvp-name">
                  {t(ui.rsvp.name)}
                  <span className="rsvp__req" aria-hidden="true">
                    *
                  </span>
                  <span className="visually-hidden">
                    ({t(ui.rsvp.required)})
                  </span>
                </label>
                <input
                  id="rsvp-name"
                  className={`rsvp__input${errors.name ? ' is-invalid' : ''}`}
                  type="text"
                  value={form.name}
                  onChange={update('name')}
                  placeholder={t(ui.rsvp.namePlaceholder)}
                  autoComplete="name"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'rsvp-name-error' : undefined}
                />
                {errors.name && (
                  <p className="rsvp__error" id="rsvp-name-error">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="rsvp__field">
                <label className="rsvp__label" htmlFor="rsvp-phone">
                  {t(ui.rsvp.phone)}
                  <span className="rsvp__req" aria-hidden="true">
                    *
                  </span>
                  <span className="visually-hidden">
                    ({t(ui.rsvp.required)})
                  </span>
                </label>
                <input
                  id="rsvp-phone"
                  className={`rsvp__input${errors.phone ? ' is-invalid' : ''}`}
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder={t(ui.rsvp.phonePlaceholder)}
                  autoComplete="tel"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? 'rsvp-phone-error' : undefined}
                />
                {errors.phone && (
                  <p className="rsvp__error" id="rsvp-phone-error">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Có / không tham dự */}
              <fieldset className="rsvp__field rsvp__fieldset">
                <legend className="rsvp__label">{t(ui.rsvp.attending)}</legend>
                <div className="rsvp__choices">
                  {[
                    { value: 'yes', label: ui.rsvp.yes },
                    { value: 'no', label: ui.rsvp.no },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`rsvp__choice${
                        form.attending === option.value ? ' is-active' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="attending"
                        value={option.value}
                        checked={form.attending === option.value}
                        onChange={update('attending')}
                        className="visually-hidden"
                      />
                      <span>{t(option.label)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Khách của nhà trai hay nhà gái */}
              <fieldset className="rsvp__field rsvp__fieldset">
                <legend className="rsvp__label">{t(ui.rsvp.side)}</legend>
                <div className="rsvp__choices">
                  {[
                    { value: 'groom', label: ui.rsvp.sideGroom },
                    { value: 'bride', label: ui.rsvp.sideBride },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`rsvp__choice${
                        form.side === option.value ? ' is-active' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="side"
                        value={option.value}
                        checked={form.side === option.value}
                        onChange={update('side')}
                        className="visually-hidden"
                      />
                      <span>{t(option.label)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Số người — chỉ hỏi khi khách nhận lời */}
              {form.attending === 'yes' && (
                <div className="rsvp__field">
                  <label className="rsvp__label" htmlFor="rsvp-guests">
                    {t(ui.rsvp.guests)}
                  </label>
                  <select
                    id="rsvp-guests"
                    className="rsvp__input rsvp__select"
                    value={form.guests}
                    onChange={update('guests')}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                      <option key={count} value={String(count)}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lời chúc */}
              <div className="rsvp__field rsvp__field--full">
                <label className="rsvp__label" htmlFor="rsvp-message">
                  {t(ui.rsvp.message)}
                  <span className="rsvp__optional">
                    ({t(ui.rsvp.optional)})
                  </span>
                </label>
                <textarea
                  id="rsvp-message"
                  className="rsvp__input rsvp__textarea"
                  rows={4}
                  value={form.message}
                  onChange={update('message')}
                  placeholder={t(ui.rsvp.messagePlaceholder)}
                />
              </div>

              <div className="rsvp__actions">
                <button type="submit" className="btn btn--solid">
                  {t(ui.rsvp.submit)}
                </button>
                <p className="rsvp__notice">{t(ui.rsvp.savedNotice)}</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
