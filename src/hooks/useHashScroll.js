import { useEffect } from 'react'

/* Cuộn tới đúng phần tử mà địa chỉ đang trỏ tới (ví dụ .../#rsvp).

   Cần thiết vì React dựng nội dung sau khi trình duyệt đã xử lý hash: lúc
   trình duyệt đi tìm #rsvp thì phần tử đó chưa tồn tại, nên nó nằm im ở đầu
   trang. Khách quét mã QR trên thiệp sẽ vào thẳng phần xác nhận tham dự, nên
   đây là đường đi chính chứ không phải chi tiết phụ.

   Cuộn hai nhịp: nhịp đầu ngay khi React dựng xong để khách thấy phản hồi
   liền, nhịp sau khi ảnh và font đã tải xong để chỉnh lại chỗ bị xê dịch.
   Mạng chậm thì ảnh phía trên tải xong muộn, đẩy nội dung trôi đi vài trăm
   pixel — không có nhịp thứ hai thì khách rơi vào giữa biểu mẫu, mất tiêu đề.

   Nhường quyền cho khách bằng cách so vị trí cuộn, KHÔNG bắt sự kiện chạm.
   Bản trước bắt touchstart để biết khách đã tự cuộn, nhưng trên điện thoại
   sự kiện chạm bắn ra ngay lúc trang đang tải — ngón tay khách còn để trên
   màn hình sau khi quét mã — nên hook tưởng khách đã tự cuộn và huỷ luôn,
   khách rơi vào đầu trang. So vị trí thì chỉ nhường khi khách thật sự đã
   cuộn đi chỗ khác.

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

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Vị trí mà lần cuộn gần nhất của hook đã đưa khách tới. Dùng để phân biệt
       "trang tự xê dịch do ảnh tải xong" với "khách tự cuộn đi chỗ khác". */
    let placedAt = null

    function scrollToTarget(el, smooth) {
      el.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto', block: 'start' })
      /* Ghi lại sau khi trình duyệt cuộn xong. */
      requestAnimationFrame(() => {
        placedAt = window.scrollY
      })
    }

    const frame = requestAnimationFrame(() => {
      if (!target) target = document.querySelector(hash)
      if (target) scrollToTarget(target, true)
    })

    /* Nhịp hai: sau khi ảnh và font xong, nếu vị trí đã lệch thì chỉnh lại,
       không hiệu ứng — lúc này khách đang nhìn nên trượt mượt lần nữa sẽ
       thành giật. */
    const settle = () => {
      if (!target) return

      /* Khách đã tự cuộn đi xa chỗ mình đặt họ: để yên. Ngưỡng 120 pixel đủ
         rộng để bỏ qua xê dịch do ảnh tải xong, đủ hẹp để nhận ra khách đã
         chủ động cuộn. */
      if (placedAt !== null && Math.abs(window.scrollY - placedAt) > 120) return

      const top = target.getBoundingClientRect().top
      if (Math.abs(top) > 8) scrollToTarget(target, false)
    }

    if (document.readyState === 'complete') settle()
    else window.addEventListener('load', settle, { once: true })

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(settle).catch(() => {})
    }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('load', settle)
    }
  }, [])
}
