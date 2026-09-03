/* ============================================================
   CƠ CHẾ ĐỔI NGÔN NGỮ — tự viết, không dùng thư viện ngoài
   ------------------------------------------------------------
   Cách dùng trong component:

       const { t, lang, toggle } = useLang()
       <h2>{t(ui.events.title)}</h2>

   Hàm t() nhận vào object { vi, ja } và trả về chuỗi đúng
   ngôn ngữ đang chọn.
   ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'wedding-lang'
const SUPPORTED = ['vi', 'ja']
const DEFAULT_LANG = 'vi'

const LanguageContext = createContext(null)

/* Chọn ngôn ngữ ban đầu theo thứ tự ưu tiên:
   1. Lựa chọn khách đã lưu từ lần trước
   2. Ngôn ngữ của trình duyệt (khách người Nhật sẽ thấy tiếng Nhật ngay)
   3. Tiếng Việt                                                        */
function detectInitialLang() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch {
    /* Trình duyệt chặn localStorage (chế độ ẩn danh) thì bỏ qua, không làm hỏng trang */
  }

  const browserLang = (window.navigator.language || '').toLowerCase()
  if (browserLang.startsWith('ja')) return 'ja'

  return DEFAULT_LANG
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang)

  /* Đồng bộ lựa chọn ra thẻ <html lang="..."> để:
     - CSS [lang='ja'] áp dụng đúng kiểu chữ cho tiếng Nhật
     - Trình đọc màn hình phát âm đúng thứ tiếng                     */
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* Không lưu được thì thôi, trang vẫn chạy bình thường */
    }
  }, [lang])

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next)
  }, [])

  const toggle = useCallback(() => {
    setLangState((current) => (current === 'vi' ? 'ja' : 'vi'))
  }, [])

  /* Lấy chuỗi theo ngôn ngữ hiện tại.
     Nếu thiếu bản dịch tiếng Nhật thì lùi về tiếng Việt để trang
     không bao giờ hiện ra chỗ trống.                                */
  const t = useCallback(
    (entry) => {
      if (entry === null || entry === undefined) return ''
      if (typeof entry === 'string') return entry
      return entry[lang] ?? entry[DEFAULT_LANG] ?? ''
    },
    [lang],
  )

  const value = useMemo(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLang() phải được gọi bên trong <LanguageProvider>')
  }
  return ctx
}
