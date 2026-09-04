/* Server chạy ngay trên máy bạn: vừa phục vụ trang web, vừa nhận phản hồi
   của khách rồi ghi thẳng vào file danh sách khách.

   Chạy:  npm run server

   Không dùng thư viện ngoài nào — chỉ các mô-đun có sẵn của Node.

   Điều phải biết:
   - Máy phải đang bật và đang chạy lệnh này thì khách mới gửi được.
   - Khách chỉ vào được nếu chung mạng wifi với máy bạn. Khách ở nhà họ
     muốn vào thì phải mở cổng router hoặc dùng dịch vụ tunnel.
   - Vì vậy mã QR in lên thiệp KHÔNG trỏ vào đây mà trỏ vào địa chỉ
     GitHub Pages cố định — đổi backend sau này thiệp đã in vẫn dùng được. */

import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const RESPONSES = join(ROOT, 'print', 'responses.jsonl')
const PORT = Number(process.env.PORT) || 4000

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

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('Chưa có bản build. Chạy trước:  npm run build')
  process.exit(1)
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

/* Gọi Python trộn phản hồi vào file Excel. Chạy nền, không bắt khách chờ. */
function mergeIntoSpreadsheet() {
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

  /* ---- API nhận phản hồi ---- */
  if (url.pathname === '/api/rsvp') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: 'chỉ nhận POST' }))
      return
    }

    try {
      const entry = JSON.parse(await readBody(req))

      if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
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

      appendFileSync(RESPONSES, JSON.stringify(record) + '\n', 'utf8')
      console.log(
        `\n[${new Date().toLocaleTimeString()}] Phản hồi mới: ` +
          `${record.name}${record.guestId ? ` (${record.guestId})` : ''} — ` +
          (record.attending === 'yes' ? `sẽ đến, ${record.guests} người` : 'không đến'),
      )
      mergeIntoSpreadsheet()

      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true }))
    } catch (err) {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: err.message }))
    }
    return
  }

  /* ---- Trang web tĩnh ---- */
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

server.listen(PORT, '0.0.0.0', () => {
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
