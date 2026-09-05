/* Nói chuyện với DynamoDB thông qua AWS CLI.

   Vì sao không dùng AWS SDK: SDK là gói npm, mà chủ dự án không muốn cài
   thư viện ngoài. AWS CLI thì vốn đã phải có sẵn trên máy chủ AWS rồi, nên
   gọi qua nó là không thêm phụ thuộc nào vào dự án.

   Đánh đổi: mỗi lần gọi phải khởi chạy một tiến trình mới, tốn khoảng
   100–300 mili giây. Với 50 khách và vài trăm lượt gọi thì không đáng kể.

   Hai bảng:
     wedding-guests     khoá chính: guestId  (danh sách khách)
     wedding-responses  khoá chính: savedAt  (phản hồi, mỗi lần gửi một dòng)

   Cấu hình bằng biến môi trường:
     RSVP_TABLE_GUESTS     mặc định wedding-guests
     RSVP_TABLE_RESPONSES  mặc định wedding-responses
     AWS_REGION            ví dụ ap-northeast-1 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'

export const TABLE_GUESTS = process.env.RSVP_TABLE_GUESTS || 'wedding-guests'
export const TABLE_RESPONSES = process.env.RSVP_TABLE_RESPONSES || 'wedding-responses'

/* Cho phép chỉ đường tới aws.cmd trên Windows, hoặc thay bằng lệnh giả khi
   chạy thử mà không muốn đụng vào AWS thật. */
const AWS_BIN = process.env.AWS_CLI_PATH || 'aws'

/* Truyền tham số JSON qua FILE chứ không nhét thẳng vào dòng lệnh.

   Lý do: lời nhắn của khách có thể chứa dấu nháy, xuống dòng, tiếng Việt có
   dấu, chữ Nhật. Nhét chuỗi đó vào dòng lệnh là mời gọi shell diễn giải sai
   — nhẹ thì hỏng dữ liệu, nặng thì thành lỗ hổng chèn lệnh. Ghi ra file rồi
   bảo AWS CLI tự đọc thì không có gì đi qua shell cả. */
async function runAwsWithInput(baseArgs, input) {
  const dir = mkdtempSync(join(tmpdir(), 'rsvp-'))
  const file = join(dir, 'input.json')
  try {
    writeFileSync(file, JSON.stringify(input), 'utf8')
    /* AWS CLI muốn dấu gạch xuôi kể cả trên Windows. Tách theo dấu phân cách
       của hệ điều hành rồi nối lại bằng '/' để không phải viết ký tự thoát. */
    const urlPath = file.split(sep).join('/')
    return await runAws([...baseArgs, '--cli-input-json', `file://${urlPath}`])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function runAws(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(AWS_BIN, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })

    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))

    child.on('error', (error) => {
      reject(new Error(`không chạy được AWS CLI (${AWS_BIN}): ${error.message}`))
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(err.trim() || `AWS CLI thoát với mã ${code}`))
        return
      }
      if (!out.trim()) {
        resolve(null)
        return
      }
      try {
        resolve(JSON.parse(out))
      } catch {
        reject(new Error('AWS CLI trả về nội dung không phải JSON'))
      }
    })
  })
}

/* ---- Đổi qua lại giữa object thường và kiểu dữ liệu của DynamoDB ----

   DynamoDB không nhận object thường mà đòi ghi rõ kiểu từng trường:
   { "name": { "S": "Nguyễn Văn A" }, "guests": { "N": "2" } }
   Hai hàm dưới lo việc dịch đó, phần còn lại của code không phải bận tâm. */

function toItem(obj) {
  const item = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') continue
    if (typeof value === 'number') item[key] = { N: String(value) }
    else if (typeof value === 'boolean') item[key] = { BOOL: value }
    else item[key] = { S: String(value) }
  }
  return item
}

function fromItem(item) {
  const obj = {}
  for (const [key, wrapped] of Object.entries(item || {})) {
    if ('N' in wrapped) obj[key] = Number(wrapped.N)
    else if ('BOOL' in wrapped) obj[key] = wrapped.BOOL
    else obj[key] = wrapped.S
  }
  return obj
}

/* ---- Ghi ---- */

export async function putResponse(record) {
  await runAwsWithInput(['dynamodb', 'put-item'], {
    TableName: TABLE_RESPONSES,
    Item: toItem(record),
  })
}

export async function putGuest(guest) {
  await runAwsWithInput(['dynamodb', 'put-item'], {
    TableName: TABLE_GUESTS,
    Item: toItem(guest),
  })
}

/* ---- Đọc ----

   Dùng scan vì bảng chỉ có vài chục dòng — quét hết còn rẻ hơn dựng chỉ mục.
   Vẫn phải lặp theo LastEvaluatedKey phòng khi dữ liệu lớn hơn dự tính,
   nếu không sẽ âm thầm mất phản hồi mà không ai biết. */

async function scanAll(table) {
  const items = []
  let startKey = null

  do {
    const input = { TableName: table }
    if (startKey) input.ExclusiveStartKey = startKey

    const page = await runAwsWithInput(['dynamodb', 'scan'], input)
    if (!page) break

    for (const item of page.Items || []) items.push(fromItem(item))
    startKey = page.LastEvaluatedKey || null
  } while (startKey)

  return items
}

export async function listResponses() {
  const items = await scanAll(TABLE_RESPONSES)
  return items.sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)))
}

export async function listGuests() {
  const items = await scanAll(TABLE_GUESTS)
  return items.sort((a, b) => String(a.guestId).localeCompare(String(b.guestId)))
}

/* Kiểm tra AWS CLI có chạy được và có quyền đọc bảng không.
   Gọi lúc server khởi động để hỏng thì biết ngay, đừng đợi tới khi khách
   gửi phản hồi mới phát hiện. */
export async function checkAccess() {
  await runAws(['dynamodb', 'describe-table', '--table-name', TABLE_RESPONSES])
}
