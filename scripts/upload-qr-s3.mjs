/* Đẩy mã QR của khách lên S3.

   Chạy:  npm run qr:s3

   Cấu hình trong .env.local ở gốc dự án (file này không bao giờ lên GitHub):
     RSVP_S3_BUCKET=ten-bucket-cua-ban
     RSVP_S3_PREFIX=qr            (tuỳ chọn, thư mục trong bucket)
     AWS_REGION=ap-northeast-1

   QUAN TRỌNG — để bucket ở chế độ RIÊNG TƯ, đừng mở công khai.

   Tên file đặt theo mã khách (K001.svg, K002.svg...) nên rất dễ đoán. Bucket
   mà công khai thì người lạ chỉ cần thử K001, K002, K003... là tải về được
   toàn bộ mã QR, mỗi mã lại chứa tên của một người khách. Tức là lộ danh
   sách khách mời. Script này không mở quyền công khai cho file nào cả. */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const QR_DIR = join(ROOT, 'print', 'qr')
const ENV_FILE = join(ROOT, '.env.local')

function loadEnv() {
  if (!existsSync(ENV_FILE)) return {}
  const out = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const at = trimmed.indexOf('=')
    if (at > 0) out[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1).trim()
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const bucket = env.RSVP_S3_BUCKET || ''
const prefix = (env.RSVP_S3_PREFIX || 'qr').replace(/^\/+|\/+$/g, '')
const awsBin = env.AWS_CLI_PATH || 'aws'

if (!bucket) {
  console.error('Thiếu RSVP_S3_BUCKET. Thêm vào .env.local:')
  console.error('')
  console.error('  RSVP_S3_BUCKET=ten-bucket-cua-ban')
  console.error('  AWS_REGION=ap-northeast-1')
  process.exit(1)
}

if (!existsSync(QR_DIR)) {
  console.error('Chưa có mã QR nào. Chạy trước:  npm run qr:khach')
  process.exit(1)
}

const files = readdirSync(QR_DIR).filter((f) => f.endsWith('.svg'))
if (files.length === 0) {
  console.error('Thư mục print/qr/ không có file .svg nào.')
  process.exit(1)
}

console.log(`Đang đẩy ${files.length} mã QR lên s3://${bucket}/${prefix}/ ...`)

const args = [
  's3',
  'sync',
  QR_DIR,
  `s3://${bucket}/${prefix}/`,
  '--exclude',
  '*',
  '--include',
  '*.svg',
  /* Không đặt --acl public-read: bucket phải ở chế độ riêng tư. */
  '--content-type',
  'image/svg+xml',
]

const child = spawn(awsBin, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('error', (error) => {
  console.error('Không chạy được AWS CLI:', error.message)
  console.error('Cài AWS CLI rồi chạy `aws configure` trước.')
  process.exit(1)
})

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`\nAWS CLI thoát với mã ${code}. Kiểm tra quyền ghi vào bucket.`)
    process.exit(code)
  }
  console.log(`\nXong. Tải về để in bằng lệnh:`)
  console.log(`  aws s3 sync s3://${bucket}/${prefix}/ ./print/qr/`)
})
