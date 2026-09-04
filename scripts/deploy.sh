#!/usr/bin/env bash
# Build website rồi đẩy thư mục dist lên nhánh gh-pages của GitHub.
#
# Cách chạy (từ thư mục gốc dự án):  bash scripts/deploy.sh
#
# Cách làm: dựng một repo git tạm hoàn toàn tách biệt trong thư mục tạm,
# chỉ chứa đúng nội dung dist, rồi force-push lên nhánh gh-pages.
# Làm vậy để không bao giờ lẫn node_modules hay file nguồn vào nhánh deploy.

set -euo pipefail

REPO_URL="https://github.com/haupx9/wedding-hau-ai.git"
TMP_DIR="${TMPDIR:-/tmp}/wedding-deploy"

cd "$(dirname "$0")/.."
PROJECT_DIR="$(pwd)"

echo "==> Build bản production"
npm run build

if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  echo "LỖI: không tìm thấy dist/index.html — build thất bại?" >&2
  exit 1
fi

echo "==> Chuẩn bị thư mục deploy tạm: $TMP_DIR"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cp -r "$PROJECT_DIR/dist/." "$TMP_DIR/"

echo "==> Tạo commit deploy"
cd "$TMP_DIR"
git init -q
git checkout -b gh-pages -q
git add -A
git -c user.email="deploy@local" -c user.name="deploy" \
    commit -q -m "Deploy: bản build website cưới"

echo "==> Push lên nhánh gh-pages"
git remote add origin "$REPO_URL"
git push origin gh-pages:gh-pages --force

cd "$PROJECT_DIR"
rm -rf "$TMP_DIR"

echo "==> Xong. Trang sẽ cập nhật sau khoảng 1 phút tại:"
echo "    https://haupx9.github.io/wedding-hau-ai/"
