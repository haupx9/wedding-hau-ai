import { useEffect } from 'react'

/* Tìm mọi phần tử có class `reveal` và gắn class `is-visible`
   khi chúng cuộn vào tầm nhìn, tạo hiệu ứng hiện dần từ dưới lên.

   Gọi một lần duy nhất ở App. Mỗi phần tử chỉ chạy hiệu ứng một lần
   rồi thôi quan sát, tránh tốn tài nguyên khi cuộn lên cuộn xuống. */
export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal')

    /* Trình duyệt quá cũ không có IntersectionObserver:
       hiện thẳng toàn bộ nội dung, thà mất hiệu ứng còn hơn mất chữ. */
    if (typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}
