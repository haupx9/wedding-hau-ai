import { useEffect } from 'react'

/* Cuộn tới đúng phần tử mà địa chỉ đang trỏ tới (ví dụ .../#rsvp).

   Cần thiết vì React dựng nội dung sau khi trình duyệt đã xử lý hash:
   lúc trình duyệt đi tìm #rsvp thì phần tử đó chưa tồn tại, nên nó
   nằm im ở đầu trang. Khách quét mã QR trên thiệp sẽ vào thẳng phần
   xác nhận tham dự, nên đây là đường đi chính chứ không phải chi tiết phụ.

   Gọi một lần duy nhất ở App. */
export function useHashScroll() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash === '#') return

    /* Chờ trình duyệt vẽ xong khung hình đầu tiên rồi mới tìm phần tử,
       lúc đó cây DOM của React đã dựng đủ. */
    const frame = requestAnimationFrame(() => {
      let target = null
      try {
        target = document.querySelector(hash)
      } catch {
        /* Hash không phải bộ chọn CSS hợp lệ thì bỏ qua, không làm gãy trang. */
        return
      }
      if (!target) return

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    })

    return () => cancelAnimationFrame(frame)
  }, [])
}
