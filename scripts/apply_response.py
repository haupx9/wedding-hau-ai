# -*- coding: utf-8 -*-
"""Trộn phản hồi của khách vào file danh sách khách.

    python scripts/apply_response.py

Đọc print/responses.jsonl (mỗi dòng một phản hồi do server ghi ra), tìm đúng
dòng khách theo mã ID rồi điền các cột phản hồi. Khách nào không có mã (vào
bằng mã QR chung hoặc tự gõ địa chỉ) thì thêm thành dòng mới ở cuối.

Ghi ra cả .xlsx lẫn .csv để chắc chắn bạn mở được ở mọi máy.
Không dùng thư viện cài thêm nào.
"""

import csv
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xlsx_min
from guests import COLUMNS, CSV, WIDTHS, XLSX

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESPONSES = os.path.join(ROOT, 'print', 'responses.jsonl')


def _digits(value):
    """Chỉ giữ chữ số để so sánh, bỏ qua dấu cách và gạch ngang."""
    return ''.join(ch for ch in str(value) if ch.isdigit())


def load_rows():
    if os.path.exists(XLSX):
        rows = xlsx_min.read(XLSX)
        if rows:
            return rows
    if os.path.exists(CSV):
        with io.open(CSV, 'r', encoding='utf-8-sig', newline='') as f:
            return [r for r in csv.reader(f)]
    return [list(COLUMNS)]


def save_rows(rows):
    xlsx_min.write(XLSX, rows, sheet_name='Khách mời', widths=WIDTHS)
    with io.open(CSV, 'w', encoding='utf-8-sig', newline='') as f:
        csv.writer(f).writerows(rows)


def main():
    if not os.path.exists(RESPONSES):
        print('Chưa có phản hồi nào.')
        return

    with io.open(RESPONSES, 'r', encoding='utf-8') as f:
        responses = [json.loads(line) for line in f if line.strip()]

    if not responses:
        print('Chưa có phản hồi nào.')
        return

    rows = load_rows()
    header = [str(c).strip() for c in rows[0]]

    # Thiếu cột nào thì bổ sung vào tiêu đề cho đủ.
    for name in COLUMNS:
        if name not in header:
            header.append(name)
    rows[0] = header

    def idx(name):
        return header.index(name)

    def cell(row, name):
        i = idx(name)
        return str(row[i]).strip() if i < len(row) and row[i] is not None else ''

    def put(row, name, value):
        i = idx(name)
        while len(row) <= i:
            row.append('')
        row[i] = value

    by_id = {}
    # Khách không có mã thì nhận diện bằng thời điểm phản hồi — chuỗi ISO có
    # cả mili giây nên coi như không đụng nhau. Cần cái này vì mỗi lần chạy,
    # script trộn lại TOÀN BỘ responses.jsonl: không nhớ dòng đã thêm thì
    # khách không mã sẽ bị nhân bản sau mỗi phản hồi mới.
    seen_times = set()
    for row in rows[1:]:
        gid = cell(row, 'ID')
        if gid:
            by_id[gid] = row
        else:
            stamp = cell(row, 'Ngày phản hồi')
            if stamp:
                seen_times.add(stamp)

    updated = 0
    added = 0

    for r in responses:
        gid = str(r.get('guestId') or '').strip()
        row = by_id.get(gid) if gid else None

        if row is None:
            if not gid and r.get('savedAt') in seen_times:
                continue  # đã thêm ở lần chạy trước rồi
            if not gid and r.get('savedAt'):
                seen_times.add(r['savedAt'])
            row = [''] * len(header)
            put(row, 'ID', gid)
            put(row, 'Họ và tên', r.get('name', ''))
            rows.append(row)
            if gid:
                by_id[gid] = row
            added += 1
        else:
            updated += 1

        # Số điện thoại: cột "Số điện thoại" là danh sách do bạn tự quản, không
        # đè lên. Nhưng số khách tự khai cũng không được vứt đi — khách có thể
        # đã đổi số. Khác nhau thì ghi sang cột riêng để bạn tự đối chiếu.
        guest_phone = str(r.get('phone') or '').strip()
        if guest_phone:
            known = cell(row, 'Số điện thoại')
            if not known:
                put(row, 'Số điện thoại', guest_phone)
            elif _digits(known) != _digits(guest_phone):
                put(row, 'SĐT khách khai', guest_phone)

        if not cell(row, 'Họ và tên') and r.get('name'):
            put(row, 'Họ và tên', r['name'])

        # Thiếu hẳn trường này thì để trống, KHÔNG mặc định là "Không".
        # Ghi bừa "Không" nghĩa là báo khách từ chối trong khi thật ra không
        # biết — đếm thiếu mâm cỗ còn tệ hơn là để trống cho bạn tự hỏi lại.
        attending = r.get('attending')
        if attending in ('yes', 'no'):
            put(row, 'Phản hồi', 'Có' if attending == 'yes' else 'Không')
        put(row, 'Số người đến', r.get('guests', ''))
        put(row, 'Lời nhắn', r.get('message', ''))
        put(row, 'Ngày phản hồi', r.get('savedAt', ''))

        if not cell(row, 'Bên') and r.get('side'):
            put(row, 'Bên', 'Nhà trai' if r['side'] == 'groom' else 'Nhà gái')

    save_rows(rows)
    print('Đã trộn %d phản hồi: cập nhật %d khách có sẵn, thêm mới %d.'
          % (len(responses), updated, added))
    print('  ' + XLSX)
    print('  ' + CSV)


if __name__ == '__main__':
    main()
