/* Server nhận phản hồi xác nhận tham dự.

   Chạy được ở hai chế độ:

   1. Trên máy chủ tiệc, để thử:      npm run server
      Vừa phục vụ trang web vừa nhận phản hồi. Chỉ khách chung wifi vào được.

   2. Trên EC2, dùng thật:            RSVP_MODE=api npm run server
      Chỉ nhận API, không phục vụ trang (trang đã nằm ở GitHub Pages).

   Không dùng thư viện ngoài nào — chỉ các mô-đun có sẵn của Node.

   Mã QR in lên thiệp luôn trỏ vào địa chỉ GitHub Pages cố định, không trỏ
   thẳng vào server này — đổi máy chủ sau này thì thiệp đã in vẫn dùng được.

   Các biến môi trường:
     RSVP_MODE=api        chỉ chạy API, không phục vụ trang
     PORT=4000            cổng lắng nghe
     RSVP_ORIGIN=...      địa chỉ trang được phép gọi (mặc định: trang GitHub Pages)
     RSVP_ADMIN_TOKEN=... mã bí mật để tải danh sách phản hồi về máy.
                          BẮT BUỘC đặt khi chạy trên EC2, nếu không đường
                          tải dữ liệu sẽ bị khoá — để hở thì bất kỳ ai cũng
                          tải được toàn bộ tên và số điện thoại khách. */

import { spawn } from 'node:child_process'

import { putResponse } from './dynamo.mjs'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const RESPONSES = join(ROOT, 'print', 'responses.jsonl')
const PORT = Number(process.env.PORT) || 4000
const API_ONLY = process.env.RSVP_MODE === 'api'
const ADMIN_TOKEN = process.env.RSVP_ADMIN_TOKEN || ''

/* Đặt RSVP_STORE=dynamodb để ghi vào DynamoDB. Bỏ trống thì chỉ ghi ra file
   trong máy — dùng khi chạy thử tại nhà. */
const USE_DYNAMO = process.env.RSVP_STORE === 'dynamodb'

/* Phản hồi ghi được vào file nhưng đẩy lên DynamoDB hỏng thì xếp vào đây,
   để lệnh `npm run dynamo:retry` đẩy lại sau. Không có chỗ này thì một lần
   AWS trục trặc là mất luôn phản hồi của khách mà không ai biết. */
const PENDING = join(ROOT, 'print', 'dynamo-pending.jsonl')

/* Mặc định KHÔNG ghi ra file — DynamoDB là nơi lưu duy nhất.

   DynamoDB đã có ghi-có-điều-kiện và tự thử lại 3 lần, nên hỏng tới mức chịu
   thua thường là hỏng thật (hết quyền, sai tên bảng) chứ không phải trục trặc
   thoáng qua. Lúc ấy server báo lỗi thật cho khách để họ gửi lại, thay vì
   nhận bừa rồi đánh mất.

   Đặt RSVP_LOCAL_FILE=1 nếu muốn bật lại lưới an toàn bằng file. */
const USE_LOCAL_FILE = process.env.RSVP_LOCAL_FILE === '1'

/* Trang nào được phép gọi API này. Mặc định là trang cưới trên GitHub Pages. */
const ALLOWED_ORIGIN = process.env.RSVP_ORIGIN || 'https://haupx9.github.io'

/* Chống bơm phản hồi giả: mỗi địa chỉ IP gửi tối đa ngần này trong 10 phút.
   Đủ rộng cho một nhà nhiều người dùng chung mạng, đủ chặt để không ai ngồi
   bơm hàng nghìn dòng rác vào danh sách khách. */
const RATE_LIMIT = 12
const RATE_WINDOW_MS = 10 * 60 * 1000
const hits = new Map()

function tooManyRequests(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS)
  list.push(now)
  hits.set(ip, list)

  /* Dọn định kỳ để bộ nhớ không phình theo số IP đã từng ghé. */
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key)
    }
  }

  return list.length > RATE_LIMIT
}

function clientIp(req) {
  /* Sau ALB hay nginx thì IP thật nằm ở X-Forwarded-For. */
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'không rõ'
}

function corsHeaders() {
  return {
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '86400',
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

if (!API_ONLY && !existsSync(join(DIST, 'index.html'))) {
  console.error('Chưa có bản build. Chạy trước:  npm run build')
  process.exit(1)
}

if (API_ONLY && !ADMIN_TOKEN) {
  console.warn(
    [
      '',
      'CẢNH BÁO: chưa đặt RSVP_ADMIN_TOKEN.',
      'Đường tải phản hồi về máy sẽ bị khoá cho tới khi đặt mã này.',
      '',
    ].join('\n'),
  )
}

mkdirSync(join(ROOT, 'print'), { recursive: true })

/* Báo cho trang biết có API ở ngay đây. Bản build đưa lên GitHub Pages
   không có dòng này nên vẫn chạy như cũ, không gọi API nào cả. */
function injectApiConfig(html) {
  return html.replace(
    '</head>',
    "<script>window.__RSVP_API__='/api/rsvp'</script></head>",
  )
}

/* Gọi Python trộn phản hồi vào file Excel. Chạy nền, không bắt khách chờ.

   Chỉ làm khi server chạy trên máy chủ tiệc. Trên EC2 thì file Excel không
   nằm ở đó — phản hồi chỉ được ghi vào responses.jsonl, máy bạn kéo về sau
   bằng lệnh `npm run sync:remote`. */
function mergeIntoSpreadsheet() {
  if (API_ONLY) return

  const python = process.platform === 'win32' ? 'python' : 'python3'
  const child = spawn(python, [join(ROOT, 'scripts', 'apply_response.py')], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', (d) => process.stdout.write('   ' + d))
  child.stderr.on('data', (d) => process.stderr.write('   ' + d))
  child.on('error', (err) => {
    console.error('   Không chạy được Python để cập nhật Excel:', err.message)
    console.error('   Phản hồi vẫn được giữ nguyên trong print/responses.jsonl')
  })
}

function readBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limitBytes) {
        reject(new Error('nội dung quá lớn'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }

  /* ---- Tải phản hồi về máy để trộn vào Excel ----
     Đường này trả về tên và số điện thoại của toàn bộ khách, nên phải có
     mã bí mật. Không đặt mã thì khoá luôn, thà không dùng được còn hơn hở. */
  if (url.pathname === '/api/responses') {
    const auth = req.headers.authorization || ''
    if (!ADMIN_TOKEN || auth !== `Bearer ${ADMIN_TOKEN}`) {
      res.writeHead(401, JSON_HEADERS)
      res.end(JSON.stringify({ ok: false, error: 'không có quyền' }))
      return
    }

    const body = existsSync(RESPONSES) ? readFileSync(RESPONSES, 'utf8') : ''
    res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8' })
    res.end(body)
    return
  }

  /* ---- API nhận phản hồi ---- */
  if (url.pathname === '/api/rsvp') {
    /* Trình duyệt hỏi trước khi gửi thật, vì trang ở GitHub Pages còn API
       ở máy chủ này — hai nguồn khác nhau. */
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders())
      res.end()
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { ...JSON_HEADERS, ...corsHeaders() })
      res.end(JSON.stringify({ ok: false, error: 'chỉ nhận POST' }))
      return
    }

    const ip = clientIp(req)
    if (tooManyRequests(ip)) {
      console.warn(`[${new Date().toLocaleTimeString()}] Chặn ${ip}: gửi quá nhiều`)
      res.writeHead(429, { ...JSON_HEADERS, ...corsHeaders() })
      res.end(JSON.stringify({ ok: false, error: 'gửi quá nhiều lần, thử lại sau' }))
      return
    }

    try {
      const entry = JSON.parse(await readBody(req))

      if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) {
        res.writeHead(400, { ...JSON_HEADERS, ...corsHeaders() })
        res.end(JSON.stringify({ ok: false, error: 'thiếu họ tên' }))
        return
      }

      const record = {
        guestId: String(entry.guestId || '').slice(0, 64),
        name: String(entry.name || '').slice(0, 200),
        phone: String(entry.phone || '').slice(0, 50),
        attending: entry.attending === 'no' ? 'no' : 'yes',
        guests: Number(entry.guests) || 0,
        side: entry.side === 'bride' ? 'bride' : 'groom',
        message: String(entry.message || '').slice(0, 2000),
        savedAt: new Date().toISOString(),
      }

      /* Ghi ra file trước. Thao tác nhanh và gần như không hỏng bao giờ, nên
         phản hồi coi như an toàn ngay lúc này, kể cả khi AWS đang trục trặc. */
      if (USE_LOCAL_FILE) {
        appendFileSync(RESPONSES, JSON.stringify(record) + '\n', 'utf8')
      }

      console.log(
        `\n[${new Date().toLocaleTimeString()}] Phản hồi mới: ` +
          `${record.name}${record.guestId ? ` (${record.guestId})` : ''} — ` +
          (record.attending === 'yes' ? `sẽ đến, ${record.guests} người` : 'không đến'),
      )

      if (USE_DYNAMO) {
        try {
          await putResponse(record)
          console.log('   đã ghi vào DynamoDB')
        } catch (error) {
          console.error('   GHI DYNAMODB HỎNG:', error.message)

          if (!USE_LOCAL_FILE) {
            /* Không còn lưới an toàn nào: phải nói thật là chưa nhận được, để
               khách gửi lại. Nhận bừa rồi đánh mất mới là tệ nhất. */
            console.error('   Đã báo lỗi cho khách để họ gửi lại.')
            res.writeHead(503, { ...JSON_HEADERS, ...corsHeaders() })
            res.end(JSON.stringify({ ok: false, error: 'chưa lưu được, bạn thử lại giúp' }))
            return
          }

          /* Còn file thì phản hồi đã an toàn: báo thành công, nhưng xếp vào
             hàng chờ để đẩy lại — không thì mất âm thầm. */
          appendFileSync(PENDING, JSON.stringify(record) + '\n', 'utf8')
          console.error('   Đã xếp vào hàng chờ. Đẩy lại bằng: npm run dynamo:retry')
        }
      }

      mergeIntoSpreadsheet()

      res.writeHead(200, { ...JSON_HEADERS, ...corsHeaders() })
      res.end(JSON.stringify({ ok: true }))
    } catch (err) {
      res.writeHead(400, { ...JSON_HEADERS, ...corsHeaders() })
      res.end(JSON.stringify({ ok: false, error: err.message }))
    }
    return
  }

  /* ---- Trang web tĩnh ---- */
  if (API_ONLY) {
    /* Chạy trên EC2 thì trang đã nằm ở GitHub Pages, ở đây chỉ có API. */
    res.writeHead(404, JSON_HEADERS)
    res.end(JSON.stringify({ ok: false, error: 'máy chủ này chỉ nhận API' }))
    return
  }

  let pathname = decodeURIComponent(url.pathname)
  if (pathname.endsWith('/')) pathname += 'index.html'

  /* Chặn đi ngược thư mục kiểu /../../ ra ngoài dist */
  const filePath = normalize(join(DIST, pathname))
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403)
    res.end('Không được phép')
    return
  }

  const target = existsSync(filePath) ? filePath : join(DIST, 'index.html')

  try {
    const ext = extname(target).toLowerCase()
    if (ext === '.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] })
      res.end(injectApiConfig(readFileSync(target, 'utf8')))
    } else {
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' })
      res.end(readFileSync(target))
    }
  } catch {
    res.writeHead(404)
    res.end('Không tìm thấy')
  }
})

/* Không chỉ định địa chỉ để Node nghe cả IPv4 lẫn IPv6. Nếu ghim '0.0.0.0'
   thì máy nào phân giải 'localhost' ra ::1 trước (Node 18 trở lên hay làm
   vậy) sẽ báo ECONNREFUSED rất khó hiểu. */
server.listen(PORT, () => {
  if (API_ONLY) {
    console.log(`\nServer API đang chạy ở cổng ${PORT}`)
    console.log(`   Chỉ nhận yêu cầu từ trang: ${ALLOWED_ORIGIN}`)
    console.log(`   Giới hạn: ${RATE_LIMIT} phản hồi mỗi ${RATE_WINDOW_MS / 60000} phút, mỗi IP`)
    console.log(`   Tải phản hồi về máy: ${ADMIN_TOKEN ? 'đã bật (cần mã bí mật)' : 'ĐANG KHOÁ'}`)
    console.log('\nPhản hồi ghi vào: print/responses.jsonl')
    console.log('Máy của bạn kéo về bằng: npm run sync:remote\n')
    return
  }

  console.log('\nServer đang chạy. Mở trên máy này:')
  console.log(`   http://localhost:${PORT}/`)

  const addresses = []
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) addresses.push(net.address)
    }
  }
  if (addresses.length) {
    console.log('\nMở từ điện thoại (phải chung wifi với máy này):')
    for (const address of addresses) console.log(`   http://${address}:${PORT}/`)
  }

  console.log('\nPhản hồi của khách ghi vào:')
  console.log('   print/responses.jsonl  (bản gốc, không bao giờ mất)')
  console.log('   danh-sach-khach.xlsx   (tự trộn vào sau mỗi phản hồi)')
  console.log('\nDừng server: bấm Ctrl+C\n')
})
