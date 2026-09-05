/* Đẩy lại những phản hồi từng ghi DynamoDB hỏng.

   Chạy:  npm run dynamo:retry

   Server luôn ghi phản hồi ra file trước rồi mới đẩy lên DynamoDB. Nếu bước
   đẩy hỏng (mất mạng, hết quyền, AWS trục trặc), phản hồi được xếp vào
   print/dynamo-pending.jsonl thay vì mất đi. Lệnh này dọn hàng chờ đó. */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { putResponse } from './dynamo.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PENDING = join(ROOT, 'print', 'dynamo-pending.jsonl')

if (!existsSync(PENDING)) {
  console.log('Hàng chờ trống, không có gì phải đẩy lại.')
  process.exit(0)
}

const lines = readFileSync(PENDING, 'utf8').split(/\r?\n/).filter((l) => l.trim())
if (lines.length === 0) {
  unlinkSync(PENDING)
  console.log('Hàng chờ trống.')
  process.exit(0)
}

console.log(`Có ${lines.length} phản hồi đang chờ đẩy lên DynamoDB.`)

const stillFailing = []
let done = 0

for (const line of lines) {
  let record
  try {
    record = JSON.parse(line)
  } catch {
    console.error('  Bỏ qua một dòng hỏng định dạng.')
    continue
  }

  try {
    await putResponse(record)
    done++
    console.log(`  OK   ${record.name || '(không tên)'} — ${record.savedAt}`)
  } catch (error) {
    stillFailing.push(line)
    console.error(`  HỎNG ${record.name || '(không tên)'}: ${error.message}`)
  }
}

if (stillFailing.length === 0) {
  unlinkSync(PENDING)
  console.log(`\nXong, đã đẩy ${done} phản hồi. Hàng chờ đã sạch.`)
} else {
  writeFileSync(PENDING, stillFailing.join('\n') + '\n', 'utf8')
  console.log(`\nĐẩy được ${done}, còn ${stillFailing.length} chưa được.`)
  console.log('Kiểm tra quyền AWS rồi chạy lại lệnh này.')
  process.exit(1)
}
