/* Kéo phản hồi từ máy chủ EC2 về máy này rồi trộn vào file Excel.

   Chạy:  npm run sync:remote

   Cần hai thứ, đặt trong file .env.local ở gốc dự án (file này đã bị chặn
   khỏi git, không bao giờ lên GitHub):

     RSVP_API_BASE=https://rsvp.ten-mien-cua-ban.com
     RSVP_ADMIN_TOKEN=chuỗi-bí-mật-giống-hệt-trên-EC2

   Mã bí mật này là thứ duy nhất ngăn người lạ tải về toàn bộ tên và số điện
   thoại khách của bạn. Đừng dán nó vào chỗ nào công khai. */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RESPONSES = join(ROOT, 'print', 'responses.jsonl')
const ENV_FILE = join(ROOT, '.env.local')

/* Đọc .env.local. Tự viết vài dòng thay vì cài gói dotenv. */
function loadEnv() {
  if (!existsSync(ENV_FILE)) return {}
  const out = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const at = trimmed.indexOf('=')
    if (at < 0) continue
    out[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1).trim()
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const base = (env.RSVP_API_BASE || '').replace(/\/+$/, '')
const token = env.RSVP_ADMIN_TOKEN || ''

if (!base || !token) {
  console.error('Thiếu cấu hình. Tạo file .env.local ở gốc dự án với nội dung:')
  console.error('')
  console.error('  RSVP_API_BASE=https://rsvp.ten-mien-cua-ban.com')
  console.error('  RSVP_ADMIN_TOKEN=chuỗi-bí-mật-giống-trên-EC2')
  process.exit(1)
}

console.log(`Đang tải phản hồi từ ${base} ...`)

let text
try {
  const response = await fetch(`${base}/api/responses`, {
    headers: { authorization: `Bearer ${token}` },
  })

  if (response.status === 401) {
    console.error('Máy chủ từ chối: mã bí mật không khớp với mã đặt trên EC2.')
    process.exit(1)
  }
  if (!response.ok) {
    console.error(`Máy chủ trả lỗi ${response.status}`)
    process.exit(1)
  }

  text = await response.text()
} catch (error) {
  console.error('Không kết nối được tới máy chủ:', error.message)
  console.error('Kiểm tra: máy EC2 còn chạy không, tên miền trỏ đúng chưa,')
  console.error('security group đã mở cổng 443 chưa.')
  process.exit(1)
}

/* Gộp với những gì đã có sẵn trên máy, bỏ trùng.
   Dùng thời điểm phản hồi làm khoá — chuỗi ISO có cả mili giây. */
const existing = existsSync(RESPONSES) ? readFileSync(RESPONSES, 'utf8') : ''
const merged = new Map()

for (const chunk of [existing, text]) {
  for (const line of chunk.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line)
      merged.set(record.savedAt || JSON.stringify(record), record)
    } catch {
      /* Dòng hỏng thì bỏ qua, không làm gãy cả lần đồng bộ. */
    }
  }
}

const all = [...merged.values()].sort((a, b) =>
  String(a.savedAt).localeCompare(String(b.savedAt)),
)

const before = existing.split(/\r?\n/).filter((l) => l.trim()).length
writeFileSync(RESPONSES, all.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')

console.log(`Tổng ${all.length} phản hồi (${all.length - before} mới).`)
console.log('Đang trộn vào file Excel ...')

const python = process.platform === 'win32' ? 'python' : 'python3'
spawn(python, [join(ROOT, 'scripts', 'apply_response.py')], {
  cwd: ROOT,
  stdio: 'inherit',
})
