import { useEffect } from 'react'

/* Cuộn tới đúng phần tử mà địa chỉ đang trỏ tới (ví dụ .../#rsvp).

   Cần thiết vì React dựng nội dung sau khi trình duyệt đã xử lý hash:
   lúc trình duyệt đi tìm #rsvp thì phần tử đó chưa tồn tại, nên nó
   nằm im ở đầu trang. Khách quét mã QR trên thiệp sẽ vào thẳng phần
   xác nhận tham dự, nên đây là đường đi chính chứ không phải chi tiết phụ.

   Cuộn hai nhịp: nhịp đầu ngay khi React dựng xong để khách thấy phản hồi
   liền, nhịp sau khi ảnh và font đã tải xong để chỉnh lại chỗ bị xê dịch.
   Mạng chậm thì ảnh phía trên tải xong muộn, đẩy nội dung trôi đi vài trăm
   pixel — không có nhịp thứ hai thì khách rơi vào giữa biểu mẫu, mất tiêu đề.

   Gọi một lần duy nhất ở App. */
export function useHashScroll() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash === '#') return

    let target = null
    try {
      target = document.querySelector(hash)
    } catch {
      /* Hash không phải bộ chọn CSS hợp lệ thì bỏ qua, không làm gãy trang. */
      return
    }
    if (!target) {
      /* Phần tử chưa dựng kịp: thử lại ở khung hình sau. */
      const retry = requestAnimationFrame(() => {
        try {
          const el = document.querySelector(hash)
          if (el) scrollTo(el, true)
        } catch {
          /* bỏ qua */
        }
      })
      return () => cancelAnimationFrame(retry)
    }

    /* Khách tự cuộn thì thôi, không giành tay lái nữa. */
    let userTookOver = false
    const yieldToUser = () => {
      userTookOver = true
    }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown']
    events.forEach((e) => window.addEventListener(e, yieldToUser, { passive: true, once: true }))

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function scrollTo(el, smooth) {
      if (userTookOver) return
      el.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto', block: 'start' })
    }

    const frame = requestAnimationFrame(() => scrollTo(target, true))

    /* Nhịp hai: sau khi ảnh/font xong, nếu vị trí đã lệch thì chỉnh lại
       không hiệu ứng — lúc này khách đang nhìn nên trượt mượt lần nữa
       sẽ thành giật. */
    const settle = () => {
      if (userTookOver) return
      const top = target.getBoundingClientRect().top
      if (Math.abs(top) > 8) scrollTo(target, false)
    }

    if (document.readyState === 'complete') settle()
    else window.addEventListener('load', settle, { once: true })

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(settle).catch(() => {})
    }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('load', settle)
      events.forEach((e) => window.removeEventListener(e, yieldToUser))
    }
  }, [])
}
