/* Gửi phản hồi xác nhận tham dự sang Google Form.

   Trang chạy tĩnh trên GitHub Pages, không có máy chủ riêng, nên dữ liệu
   được đẩy thẳng vào một Google Form của chủ tiệc; Google Form lại đổ vào
   một Google Sheet — đó chính là chỗ lưu danh sách khách.

   Vì sao dùng cách này: không phải cài thư viện nào, và không có khoá bí
   mật nào phải nhúng vào mã nguồn công khai (địa chỉ nhận của Google Form
   vốn công khai theo thiết kế).

   Hạn chế phải biết: Google không cho trang khác đọc kết quả trả về, nên
   phải gửi ở chế độ 'no-cors' — trình duyệt gửi đi thật nhưng che kín phản
   hồi. Do đó KHÔNG thể phân biệt Google đã nhận hay đã từ chối. Hàm này chỉ
   báo được "đã gửi đi" hoặc "không gửi nổi" (mất mạng, quá hạn chờ). */

/* Chờ quá lâu thì thôi, để khách không phải ngồi nhìn nút quay mãi. */
const TIMEOUT_MS = 10000

/* Đổi tên trường trong biểu mẫu của web sang mã entry.XXXX của Google Form.
   Trường nào chưa khai trong cấu hình thì bỏ qua, không gửi. */
function buildFormData(entry, fields) {
  const data = new FormData()

  for (const [key, entryId] of Object.entries(fields)) {
    if (!entryId) continue
    const value = entry[key]
    if (value === undefined || value === null || value === '') continue
    data.append(entryId, String(value))
  }

  return data
}

/* Địa chỉ API do server trên máy chủ tiệc chèn vào trang lúc phục vụ.
   Bản build đưa lên GitHub Pages không có biến này. */
function localApiUrl() {
  return typeof window !== 'undefined' && window.__RSVP_API__ ? window.__RSVP_API__ : ''
}

/* Gửi tới API thật (server chạy trên máy chủ tiệc).

   Khác hẳn đường Google Form: đây là API của chính mình nên đọc được kết quả
   trả về — biết chắc đã ghi được hay chưa, không phải đoán. */
async function sendToApi(entry, url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      signal: controller.signal,
    })

    if (!response.ok) {
      return { sent: false, reason: `máy chủ trả lỗi ${response.status}` }
    }

    const result = await response.json().catch(() => ({ ok: true }))
    return result && result.ok === false
      ? { sent: false, reason: result.error || 'máy chủ từ chối' }
      : { sent: true, confirmed: true }
  } catch (error) {
    const reason = error && error.name === 'AbortError' ? 'quá hạn chờ' : 'lỗi mạng'
    return { sent: false, reason }
  } finally {
    clearTimeout(timer)
  }
}

/* Trả về:
     { sent: true, confirmed: true }  — máy chủ xác nhận đã ghi (đường API)
     { sent: true }                   — đã đẩy đi nhưng không biết kết quả (đường Google Form)
     { sent: false, reason: '...' }   — chưa cấu hình, mất mạng, hoặc quá hạn chờ  */
export async function submitRsvp(entry, config, apiConfig) {
  /* Thứ tự ưu tiên:
     1. Server đang phục vụ chính trang này (lúc thử tại máy chủ tiệc)
     2. Địa chỉ API cấu hình sẵn (máy chủ EC2)
     3. Google Form (nếu có ngày cần tới) */
  const api = localApiUrl() || (apiConfig && apiConfig.url) || ''
  if (api) return sendToApi(entry, api)

  if (!config || !config.action) {
    return { sent: false, reason: 'chưa cấu hình nơi nhận phản hồi' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    await fetch(config.action, {
      method: 'POST',
      /* Bắt buộc: Google không trả header CORS cho trang ngoài. */
      mode: 'no-cors',
      /* Gửi dạng FormData để trình duyệt khỏi bắn thêm request kiểm tra
         quyền (preflight) — Google Form sẽ từ chối request đó. */
      body: buildFormData(entry, config.fields || {}),
      signal: controller.signal,
    })
    return { sent: true }
  } catch (error) {
    const reason = error && error.name === 'AbortError' ? 'quá hạn chờ' : 'lỗi mạng'
    return { sent: false, reason }
  } finally {
    clearTimeout(timer)
  }
}
