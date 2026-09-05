/* Kéo phản hồi từ DynamoDB về máy rồi trộn vào file Excel.

   Chạy:  npm run sync:dynamo

   Khác `sync:remote` ở chỗ: lệnh này đọc thẳng DynamoDB bằng AWS CLI, không
   đi qua máy chủ. Nhờ vậy không cần mã bí mật của server, và máy chủ có sập
   thì bạn vẫn lấy được dữ liệu — đó chính là lý do chọn DynamoDB.

   Cần: AWS CLI đã `aws configure` trên máy này, với quyền đọc bảng.
   Cấu hình trong .env.local:
     AWS_REGION=ap-northeast-1
     RSVP_TABLE_RESPONSES=wedding-responses   (nếu đặt tên khác mặc định) */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RESPONSES = join(ROOT, 'print', 'responses.jsonl')
const ENV_FILE = join(ROOT, '.env.local')

/* Nạp .env.local vào process.env TRƯỚC khi import dynamo.mjs, vì mô-đun đó
   đọc tên bảng và đường dẫn AWS CLI ngay lúc được nạp. */
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const at = trimmed.indexOf('=')
    if (at > 0) {
      const key = trimmed.slice(0, at).trim()
      if (!process.env[key]) process.env[key] = trimmed.slice(at + 1).trim()
    }
  }
}

const { listResponses } = await import('./dynamo.mjs')

console.log('Đang đọc phản hồi từ DynamoDB ...')

let remote
try {
  remote = await listResponses()
} catch (error) {
  console.error('Không đọc được DynamoDB:', error.message)
  console.error('')
  console.error('Kiểm tra:')
  console.error('  - đã cài AWS CLI và chạy `aws configure` chưa')
  console.error('  - AWS_REGION có đúng vùng đặt bảng không')
  console.error('  - tài khoản có quyền Scan trên bảng không')
  process.exit(1)
}

/* Gộp với những gì đã có sẵn trên máy, bỏ trùng theo thời điểm phản hồi. */
const merged = new Map()

if (existsSync(RESPONSES)) {
  for (const line of readFileSync(RESPONSES, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line)
      merged.set(record.savedAt || JSON.stringify(record), record)
    } catch {
      /* Dòng hỏng thì bỏ qua, đừng làm gãy cả lần đồng bộ. */
    }
  }
}

const before = merged.size
for (const record of remote) {
  merged.set(record.savedAt || JSON.stringify(record), record)
}

const all = [...merged.values()].sort((a, b) =>
  String(a.savedAt).localeCompare(String(b.savedAt)),
)

writeFileSync(RESPONSES, all.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')

console.log(`DynamoDB có ${remote.length} phản hồi.`)
console.log(`Tổng sau khi gộp: ${all.length} (${all.length - before} mới).`)
console.log('Đang trộn vào file Excel ...')

const python = process.platform === 'win32' ? 'python' : 'python3'
spawn(python, [join(ROOT, 'scripts', 'apply_response.py')], {
  cwd: ROOT,
  stdio: 'inherit',
})
