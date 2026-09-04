# -*- coding: utf-8 -*-
"""Quản lý danh sách khách mời.

    python scripts/guests.py init     tạo file danh sách mẫu (.xlsx và .csv)
    python scripts/guests.py export   đọc danh sách, xuất print/guests.json
                                      cho lệnh sinh mã QR dùng

Đọc được cả .xlsx lẫn .csv — sửa file nào cũng được, ưu tiên .xlsx nếu có cả hai.
Không dùng thư viện cài thêm nào (xem scripts/xlsx_min.py).
"""

import csv
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xlsx_min

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'danh-sach-khach.xlsx')
CSV = os.path.join(ROOT, 'danh-sach-khach.csv')
OUT_JSON = os.path.join(ROOT, 'print', 'guests.json')

# Thứ tự cột. Năm cột đầu bạn điền trước khi sinh mã QR;
# bốn cột sau điền dần khi khách phản hồi.
COLUMNS = [
    'ID',
    'Họ và tên',
    'Số điện thoại',
    'SĐT khách khai',
    'Bên',
    'Ghi chú',
    'Phản hồi',
    'Số người đến',
    'Lời nhắn',
    'Ngày phản hồi',
]

WIDTHS = [10, 26, 16, 16, 12, 22, 12, 14, 34, 16]

SAMPLE = [
    ['K001', 'Nguyễn Văn A', '0901234567', '', 'Nhà trai', 'Bạn cấp 3', '', '', '', ''],
    ['K002', '山田 太郎', '090-1234-5678', '', 'Nhà gái', '会社の同僚', '', '', '', ''],
]


def cmd_init():
    if os.path.exists(XLSX) or os.path.exists(CSV):
        print('Đã có sẵn danh sách, không ghi đè.')
        print('  ' + XLSX if os.path.exists(XLSX) else '')
        print('  ' + CSV if os.path.exists(CSV) else '')
        return

    rows = [COLUMNS] + SAMPLE
    xlsx_min.write(XLSX, rows, sheet_name='Khách mời', widths=WIDTHS)

    # Bản CSV để chắc chắn mở được ở mọi máy. BOM để Excel hiểu đúng
    # tiếng Việt và tiếng Nhật thay vì hiện ra ký tự lạ.
    with io.open(CSV, 'w', encoding='utf-8-sig', newline='') as f:
        csv.writer(f).writerows(rows)

    print('Đã tạo:')
    print('  ' + XLSX)
    print('  ' + CSV)
    print('\nĐiền 5 cột đầu (ID, Họ và tên, Số điện thoại, Bên, Ghi chú) rồi chạy:')
    print('  npm run qr:khach')


def _load_rows():
    if os.path.exists(XLSX):
        return xlsx_min.read(XLSX), XLSX
    if os.path.exists(CSV):
        with io.open(CSV, 'r', encoding='utf-8-sig', newline='') as f:
            return [r for r in csv.reader(f)], CSV
    return None, None


def cmd_export():
    rows, source = _load_rows()
    if rows is None:
        print('Chưa có danh sách khách. Chạy trước: python scripts/guests.py init')
        sys.exit(1)

    if not rows:
        print('Danh sách rỗng.')
        sys.exit(1)

    header = [str(c).strip() for c in rows[0]]

    def col(name):
        return header.index(name) if name in header else -1

    i_id, i_name = col('ID'), col('Họ và tên')
    if i_id < 0 or i_name < 0:
        print('Thiếu cột "ID" hoặc "Họ và tên" trong %s' % source)
        sys.exit(1)

    i_phone, i_side, i_note = col('Số điện thoại'), col('Bên'), col('Ghi chú')

    guests = []
    seen = set()
    problems = []

    for line, row in enumerate(rows[1:], start=2):
        def cell(idx):
            return str(row[idx]).strip() if 0 <= idx < len(row) and row[idx] is not None else ''

        gid, name = cell(i_id), cell(i_name)
        if not gid and not name:
            continue  # hàng trống, bỏ qua
        if not gid:
            problems.append('dòng %d: thiếu ID (%s)' % (line, name))
            continue
        if not name:
            problems.append('dòng %d: thiếu họ tên (%s)' % (line, gid))
            continue
        if gid in seen:
            problems.append('dòng %d: ID "%s" bị trùng' % (line, gid))
            continue
        seen.add(gid)

        guests.append({
            'id': gid,
            'name': name,
            'phone': cell(i_phone),
            'side': cell(i_side),
            'note': cell(i_note),
        })

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with io.open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(guests, f, ensure_ascii=False, indent=2)

    print('Đọc %s → %d khách hợp lệ' % (os.path.basename(source), len(guests)))
    if problems:
        print('\nCó %d dòng bị bỏ qua:' % len(problems))
        for p in problems:
            print('  - ' + p)


if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else ''
    if action == 'init':
        cmd_init()
    elif action == 'export':
        cmd_export()
    else:
        print(__doc__)
        sys.exit(1)
