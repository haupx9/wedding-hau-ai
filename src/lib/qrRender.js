/* ============================================================
   VẼ MÃ QR RA SVG VÀ PNG
   ------------------------------------------------------------
   File này KHÔNG biết cách mã hoá QR. Nó chỉ nhận kết quả đã
   mã hoá sẵn từ `src/lib/qrcode.js`:

       const qr = encodeQR('https://...')   // { size, modules }
       qrToSvgString(qr)                    // chuỗi SVG (vector, in nét)
       qrToPngDataUrl(qr)                   // data URL ảnh PNG

   Quy ước dữ liệu vào:
     - qr.size    : số ô (module) trên mỗi cạnh, CHƯA tính viền trắng
     - qr.modules : mảng 2 chiều, modules[hàng][cột] === true là ô ĐEN

   Vì sao phải có "viền trắng" (quiet zone)?
   Chuẩn QR yêu cầu chừa quanh mã một khoảng trắng rộng 4 ô. Thiếu
   khoảng này, máy quét khó tách mã ra khỏi hoạ tiết của tấm thiệp.
   ============================================================ */

/* Viền trắng tiêu chuẩn: 4 ô mỗi bên */
export const DEFAULT_QUIET_ZONE = 4

/* Ảnh PNG dùng để IN nên phải đủ lớn.
   Dưới 1000px, khi in cỡ 3–4cm trên giấy thiệp, các ô sẽ bị nhoè. */
export const MIN_PNG_SIZE = 1000

const DEFAULT_DARK = '#000000'
const DEFAULT_LIGHT = '#FFFFFF'

/* ------------------------------------------------------------
   Kiểm tra dữ liệu đầu vào.
   Thà báo lỗi rõ ràng ngay từ đầu còn hơn vẽ ra một ô vuông trắng
   rồi khách quét mãi không được.
   ------------------------------------------------------------ */
function normalizeQr(qr) {
  if (!qr || typeof qr !== 'object') {
    throw new TypeError('qrRender: thiếu dữ liệu mã QR ({ size, modules }).')
  }

  const { size, modules } = qr

  if (!Number.isInteger(size) || size <= 0) {
    throw new TypeError('qrRender: qr.size phải là số nguyên dương.')
  }

  if (!Array.isArray(modules) || modules.length < size) {
    throw new TypeError('qrRender: qr.modules không khớp với qr.size.')
  }

  return { size, modules }
}

function normalizeQuietZone(value) {
  if (value === undefined || value === null) return DEFAULT_QUIET_ZONE
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_QUIET_ZONE
}

/* ------------------------------------------------------------
   Gom các ô đen liền nhau trên cùng một hàng thành một "vệt".
   Ví dụ 5 ô đen liền nhau -> 1 hình chữ nhật thay vì 5 hình.
   Nhờ vậy file SVG nhẹ đi nhiều lần, và khi vẽ lên canvas cũng
   ít lệnh vẽ hơn.

   Trả về mảng { row, col, length } theo toạ độ ô (chưa cộng viền).
   ------------------------------------------------------------ */
function collectRuns(size, modules) {
  const runs = []

  for (let row = 0; row < size; row += 1) {
    const line = modules[row] || []
    let start = -1

    for (let col = 0; col < size; col += 1) {
      const isDark = line[col] === true

      if (isDark && start === -1) {
        start = col
      } else if (!isDark && start !== -1) {
        runs.push({ row, col: start, length: col - start })
        start = -1
      }
    }

    /* Vệt đen chạy tới sát mép phải thì đóng lại ở đây */
    if (start !== -1) {
      runs.push({ row, col: start, length: size - start })
    }
  }

  return runs
}

/* Chỉ cho phép các ký tự an toàn trong thuộc tính XML,
   tránh trường hợp một giá trị màu lạ làm hỏng cú pháp SVG. */
function escapeXmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/* ============================================================
   1. SVG — dùng để tải file .svg
   ------------------------------------------------------------
   SVG là ảnh vector: phóng to bao nhiêu cũng không vỡ, nên đây là
   định dạng nên đưa cho nhà in.

   Tuỳ chọn:
     quietZone  số ô viền trắng (mặc định 4)
     dark       màu ô đen        (mặc định #000000)
     light      màu nền; đặt 'none' hoặc null để nền trong suốt
     pixelSize  số pixel cho mỗi ô, dùng để suy ra chiều rộng
     width      chiều rộng cụ thể (px) — ưu tiên hơn pixelSize
     title      nhãn mô tả cho trình đọc màn hình
   ============================================================ */
export function qrToSvgString(qr, options = {}) {
  const { size, modules } = normalizeQr(qr)

  const quietZone = normalizeQuietZone(options.quietZone)
  const dark = options.dark || DEFAULT_DARK
  const light = options.light === undefined ? DEFAULT_LIGHT : options.light
  const title = options.title

  /* Số ô trên mỗi cạnh sau khi cộng viền trắng hai bên.
     Đây cũng chính là hệ toạ độ bên trong SVG (mỗi ô rộng 1 đơn vị). */
  const total = size + quietZone * 2

  const pixelSize =
    Number.isFinite(Number(options.pixelSize)) && Number(options.pixelSize) > 0
      ? Number(options.pixelSize)
      : 8

  const width =
    Number.isFinite(Number(options.width)) && Number(options.width) > 0
      ? Math.round(Number(options.width))
      : Math.round(total * pixelSize)

  /* Gộp các ô đen thành một thẻ <path> duy nhất.
     Mỗi vệt là một hình chữ nhật khép kín: đi sang phải, xuống 1 ô,
     quay lại rồi đóng hình. */
  const commands = collectRuns(size, modules).map(
    ({ row, col, length }) =>
      `M${col + quietZone} ${row + quietZone}h${length}v1h-${length}z`,
  )

  const hasBackground = light !== null && light !== 'none' && light !== ''

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" ` +
      `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" ` +
      `role="img"${title ? ` aria-label="${escapeXmlAttribute(title)}"` : ''}>`,
  ]

  if (title) {
    parts.push(`<title>${escapeXmlAttribute(title)}</title>`)
  }

  if (hasBackground) {
    parts.push(
      `<rect width="${total}" height="${total}" fill="${escapeXmlAttribute(light)}"/>`,
    )
  }

  if (commands.length > 0) {
    parts.push(
      `<path fill="${escapeXmlAttribute(dark)}" d="${commands.join('')}"/>`,
    )
  }

  parts.push('</svg>')

  return parts.join('')
}

/* ============================================================
   2. PNG — dùng để tải ảnh gửi cho nhà in hoặc chèn vào file thiệp
   ------------------------------------------------------------
   Bí quyết để mã quét nhạy: mỗi ô phải chiếm TRÒN số pixel.
   Nếu mỗi ô rộng 7,3 pixel thì trình duyệt sẽ làm mờ viền (khử răng
   cưa) và ranh giới đen/trắng bị nhoè.

   Vì vậy ta làm tròn LÊN kích thước mỗi ô, rồi lấy kích thước ảnh
   thật = (số ô) × (pixel mỗi ô). Ảnh có thể to hơn yêu cầu một chút,
   nhưng luôn sắc nét tuyệt đối.

   Tuỳ chọn:
     size       cạnh ảnh mong muốn (px), tối thiểu 1000
     quietZone  số ô viền trắng (mặc định 4)
     dark/light màu ô đen / màu nền
   ============================================================ */
export function qrToPngDataUrl(qr, options = {}) {
  const { size, modules } = normalizeQr(qr)

  if (typeof document === 'undefined') {
    throw new Error('qrRender: chỉ tạo được ảnh PNG khi chạy trên trình duyệt.')
  }

  const quietZone = normalizeQuietZone(options.quietZone)
  const dark = options.dark || DEFAULT_DARK
  const light = options.light || DEFAULT_LIGHT

  const total = size + quietZone * 2

  const requested = Number(options.size)
  const target = Math.max(
    MIN_PNG_SIZE,
    Number.isFinite(requested) && requested > 0 ? requested : MIN_PNG_SIZE,
  )

  /* Làm tròn LÊN để mỗi ô là số nguyên pixel (xem giải thích ở trên) */
  const modulePx = Math.max(1, Math.ceil(target / total))
  const canvasSize = modulePx * total

  const canvas = document.createElement('canvas')
  canvas.width = canvasSize
  canvas.height = canvasSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('qrRender: trình duyệt không hỗ trợ canvas 2D.')
  }

  /* Tắt làm mượt ảnh — ta vẽ toàn hình chữ nhật, không cần nội suy */
  ctx.imageSmoothingEnabled = false

  ctx.fillStyle = light
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  ctx.fillStyle = dark
  for (const { row, col, length } of collectRuns(size, modules)) {
    ctx.fillRect(
      (col + quietZone) * modulePx,
      (row + quietZone) * modulePx,
      length * modulePx,
      modulePx,
    )
  }

  return canvas.toDataURL('image/png')
}
