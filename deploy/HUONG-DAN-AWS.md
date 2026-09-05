# Dựng hạ tầng AWS cho website cưới

Kiến trúc:

```
Khách quét QR riêng → trang trên GitHub Pages (miễn phí, tên miền riêng)
                            ↓ HTTPS
                  API Node trên Lightsail (~5 USD/tháng)
                            ↓
                       DynamoDB (gần như 0 đồng)

Mã QR: sinh tại máy bạn → đẩy lên S3 (bucket RIÊNG TƯ)
Máy bạn: npm run sync:dynamo → kéo về, xuất ra Excel
```

Chi phí ước tính: **~5 USD/tháng** cộng tên miền ~12 USD/năm.

---

## 1. Mua tên miền

Mua ở Namecheap, Cloudflare Registrar, hoặc お名前.com. Tên càng ngắn thì mã
QR càng thưa, càng dễ quét khi in nhỏ trên thiệp.

Sẽ dùng hai địa chỉ:

| Địa chỉ | Trỏ tới |
|---|---|
| `ten-mien-cua-ban.com` | GitHub Pages (trang cưới) |
| `api.ten-mien-cua-ban.com` | Lightsail (nhận phản hồi) |

## 2. Gắn tên miền vào GitHub Pages

Ở nơi quản lý DNS, thêm:

| Loại | Tên | Giá trị |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `haupx9.github.io` |

Rồi vào repo → Settings → Pages → Custom domain → nhập tên miền → bật
**Enforce HTTPS**.

## 3. Tạo hai bảng DynamoDB

Vùng nên chọn `ap-northeast-1` (Tokyo) cho gần khách ở Nhật.

```bash
aws dynamodb create-table \
  --table-name wedding-responses \
  --attribute-definitions \
      AttributeName=guestId,AttributeType=S \
      AttributeName=responseKey,AttributeType=S \
  --key-schema \
      AttributeName=guestId,KeyType=HASH \
      AttributeName=responseKey,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1

aws dynamodb create-table \
  --table-name wedding-guests \
  --attribute-definitions AttributeName=guestId,AttributeType=S \
  --key-schema AttributeName=guestId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

**Bảng phản hồi dùng khoá kép** — `guestId` phân vùng, `responseKey` sắp xếp.
DynamoDB **không cho đổi khoá sau khi bảng đã tạo**; muốn đổi phải xoá làm
lại, mà lúc đó dữ liệu khách đã nằm trong đó. Nên phải đúng ngay từ đầu.

`responseKey` có dạng `2027-01-15T09:22:31.482Z#a3f9` — thời điểm gửi cộng
mấy ký tự ngẫu nhiên. Thời điểm đứng đầu nên danh sách tự sắp theo thứ tự
thời gian; phần ngẫu nhiên để hai phản hồi trùng nhau tới mili giây không
ghi đè lên nhau.

`PAY_PER_REQUEST` nghĩa là trả theo lượt dùng — với 50 khách thì gần như
không mất tiền, và không phải đoán trước công suất.

## 4. Tạo bucket S3 chứa mã QR

```bash
aws s3 mb s3://ten-bucket-cua-ban --region ap-northeast-1
```

**Để nguyên chế độ riêng tư.** Đừng bật public access.

Lý do: file đặt tên theo mã khách (`K001.svg`, `K002.svg`...) nên rất dễ đoán.
Bucket công khai thì người lạ chỉ cần thử K001, K002, K003… là tải được toàn
bộ mã QR, mà mỗi mã lại chứa tên một người khách — tức là lộ danh sách khách
mời của bạn.

## 5. Tạo IAM user cho máy chủ

**Lightsail không gắn được IAM role như EC2**, nên phải tạo user riêng và lưu
khoá trên máy. Vì vậy khoá đó bắt buộc phải bị giới hạn quyền chặt.

1. IAM → Users → Create user, đặt tên `wedding-rsvp-server`
2. Không cần quyền đăng nhập bảng điều khiển
3. Tạo policy mới, dán nội dung file `deploy/iam-policy.json` (nhớ đổi
   `SO_TAI_KHOAN`, `VUNG`, `TEN-BUCKET`), gắn policy đó cho user
4. Tạo access key, giữ lại `Access Key ID` và `Secret Access Key`

Policy này chỉ cho phép ghi/đọc đúng hai bảng và đúng thư mục `qr/` trong một
bucket. Khoá bị lộ thì thiệt hại giới hạn ở đó, không đụng được phần còn lại
của tài khoản AWS.

## 6. Tạo máy Lightsail

1. Lightsail → Create instance
2. Vùng: Tokyo
3. Hệ điều hành: **Ubuntu 22.04 LTS**
4. Gói: **5 USD/tháng** (1 GB RAM) — hoặc 3,5 USD cũng đủ
5. Tạo xong vào Networking → **Create static IP** rồi gắn vào máy (miễn phí)
6. Networking → Firewall, mở cổng **80** và **443**

Trỏ DNS: thêm bản ghi `A` cho `api.ten-mien-cua-ban.com` về IP tĩnh vừa tạo.

## 7. Cài đặt trên máy Lightsail

SSH vào máy rồi chạy:

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# AWS CLI
sudo apt-get install -y awscli
aws configure          # dán Access Key, Secret Key, vùng ap-northeast-1

# Lấy code về
git clone https://github.com/haupx9/wedding-hau-ai.git ~/wedding
cd ~/wedding
```

Không cần `npm install` — server chỉ dùng các mô-đun có sẵn của Node.

Thử xem AWS CLI đã thông chưa:

```bash
aws dynamodb describe-table --table-name wedding-responses
```

## 8. Chứng chỉ HTTPS

Trang chạy `https`, nên trình duyệt **chặn thẳng** việc gọi API qua `http`.
Bắt buộc phải có chứng chỉ.

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d api.ten-mien-cua-ban.com
```

Chứng chỉ nằm ở `/etc/letsencrypt/live/api.ten-mien-cua-ban.com/`.

Cách đơn giản nhất để dùng nó là đặt nginx đứng trước, chuyển tiếp về cổng
4000 của server Node:

```bash
sudo apt-get install -y nginx
```

Nội dung `/etc/nginx/sites-available/rsvp`:

```nginx
server {
    listen 443 ssl;
    server_name api.ten-mien-cua-ban.com;

    ssl_certificate     /etc/letsencrypt/live/api.ten-mien-cua-ban.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ten-mien-cua-ban.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rsvp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`X-Forwarded-For` là bắt buộc — không có nó thì phần chặn spam sẽ thấy mọi
khách đều đến từ cùng một địa chỉ (chính nginx) và chặn nhầm người thật.

## 9. Chạy server như một dịch vụ

```bash
sudo cp ~/wedding/deploy/rsvp-api.service /etc/systemd/system/
sudo nano /etc/systemd/system/rsvp-api.service
```

Sửa trong file đó:
- `RSVP_ADMIN_TOKEN` — sinh bằng `openssl rand -hex 32`
- `RSVP_ORIGIN` — đổi thành `https://ten-mien-cua-ban.com`
- thêm dòng `Environment=RSVP_STORE=dynamodb`
- thêm dòng `Environment=AWS_REGION=ap-northeast-1`

Rồi bật:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rsvp-api
sudo journalctl -u rsvp-api -f      # xem log
```

## 10. Nối trang web vào API

Ở máy bạn, sửa `src/data/weddingConfig.js`:

```js
siteUrl: 'https://ten-mien-cua-ban.com/',
rsvpApi: {
  url: 'https://api.ten-mien-cua-ban.com/api/rsvp',
},
```

Rồi:

```bash
npm run qr:khach     # sinh lại mã QR theo địa chỉ mới
npm run deploy       # đưa trang lên
```

**Sinh lại mã QR là bắt buộc** nếu bạn đổi tên miền. Địa chỉ nằm trong mã QR
đã in ra là vĩnh viễn, không sửa được.

## 11. Kiểm tra thật trước khi in thiệp

1. Mở `https://ten-mien-cua-ban.com/?g=K001#rsvp` trên điện thoại
2. Điền và gửi thử
3. Ở máy bạn: `npm run sync:dynamo` — phải thấy phản hồi trong Excel
4. **Quét thử mã QR bằng camera điện thoại thật**, không chỉ gõ tay địa chỉ

Chỉ khi cả 4 bước đều đạt mới đem in số lượng lớn.

---

## Các lệnh dùng hằng ngày

| Lệnh | Việc |
|---|---|
| `npm run khach:init` | Tạo file danh sách khách |
| `npm run qr:khach` | Sinh mã QR riêng cho từng khách |
| `npm run qr:s3` | Đẩy mã QR lên S3 |
| `npm run sync:dynamo` | Kéo phản hồi từ DynamoDB về Excel |
| `npm run dynamo:retry` | Đẩy lại phản hồi bị lỗi lúc ghi |
| `npm run deploy` | Đưa trang web lên |

## Khi xong đám cưới

Nhớ xoá để khỏi bị tính tiền tiếp:

```bash
aws dynamodb delete-table --table-name wedding-responses
aws dynamodb delete-table --table-name wedding-guests
aws s3 rb s3://ten-bucket-cua-ban --force
```

Và xoá máy Lightsail trong bảng điều khiển. Nhớ **tải file Excel về giữ lại**
trước khi xoá.
