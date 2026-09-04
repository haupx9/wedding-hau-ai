# -*- coding: utf-8 -*-
"""Đọc và ghi file .xlsx chỉ bằng thư viện chuẩn của Python.

Không dùng openpyxl hay bất kỳ gói cài thêm nào, theo yêu cầu của chủ dự án
(không tự ý tải thư viện ngoài). File .xlsx thực chất là một file ZIP chứa
mấy file XML, nên zipfile + xml.etree trong thư viện chuẩn là đủ.

Chỉ làm đúng phần cần cho danh sách khách: một trang tính, ô toàn chữ hoặc số.
Không xử lý công thức, ngày tháng, định dạng phức tạp.
"""

import zipfile
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'


def _col_letter(index):
    """0 -> A, 25 -> Z, 26 -> AA"""
    letters = ''
    index += 1
    while index > 0:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def _col_index(letters):
    """A -> 0, Z -> 25, AA -> 26"""
    total = 0
    for ch in letters:
        total = total * 26 + (ord(ch.upper()) - 64)
    return total - 1


def _split_ref(ref):
    """'B12' -> ('B', 12)"""
    letters = ''
    digits = ''
    for ch in ref:
        if ch.isalpha():
            letters += ch
        else:
            digits += ch
    return letters, int(digits or 0)


def write(path, rows, sheet_name='Sheet1', widths=None, freeze_header=True):
    """Ghi danh sách hàng (mỗi hàng là list các giá trị) ra file .xlsx.

    widths: list số, độ rộng từng cột (đơn vị của Excel, ~ số ký tự).
    freeze_header: khoá hàng đầu để cuộn xuống vẫn thấy tên cột.
    """
    cols_xml = ''
    if widths:
        parts = [
            '<col min="%d" max="%d" width="%s" customWidth="1"/>' % (i + 1, i + 1, w)
            for i, w in enumerate(widths)
        ]
        cols_xml = '<cols>%s</cols>' % ''.join(parts)

    pane_xml = ''
    if freeze_header:
        pane_xml = (
            '<sheetViews><sheetView workbookViewId="0" tabSelected="1">'
            '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
            '</sheetView></sheetViews>'
        )

    rows_xml = []
    for r, row in enumerate(rows, start=1):
        cells = []
        for c, value in enumerate(row):
            if value is None or value == '':
                continue
            ref = '%s%d' % (_col_letter(c), r)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                cells.append('<c r="%s"><v>%s</v></c>' % (ref, value))
            else:
                cells.append(
                    '<c r="%s" t="inlineStr"><is><t xml:space="preserve">%s</t></is></c>'
                    % (ref, escape(str(value)))
                )
        rows_xml.append('<row r="%d">%s</row>' % (r, ''.join(cells)))

    sheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="%s">%s%s<sheetData>%s</sheetData></worksheet>'
        % (NS_MAIN, pane_xml, cols_xml, ''.join(rows_xml))
    )

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '</Types>'
    )

    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        '</Relationships>'
    )

    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="%s" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="%s" sheetId="1" r:id="rId1"/></sheets></workbook>'
        % (NS_MAIN, escape(sheet_name))
    )

    workbook_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '</Relationships>'
    )

    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', root_rels)
        z.writestr('xl/workbook.xml', workbook)
        z.writestr('xl/_rels/workbook.xml.rels', workbook_rels)
        z.writestr('xl/worksheets/sheet1.xml', sheet)


def read(path):
    """Đọc trang tính đầu tiên, trả về list các hàng (list chuỗi).

    Hiểu cả hai kiểu lưu chữ: inlineStr (do hàm write ở trên tạo ra) và
    sharedStrings (Excel dùng khi bạn mở file rồi bấm lưu).
    """
    with zipfile.ZipFile(path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in root.findall('{%s}si' % NS_MAIN):
                # Chữ có thể bị Excel cắt thành nhiều đoạn <r><t>, nối lại.
                shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS_MAIN)))

        name = 'xl/worksheets/sheet1.xml'
        if name not in z.namelist():
            sheets = [n for n in z.namelist() if n.startswith('xl/worksheets/sheet')]
            if not sheets:
                return []
            name = sorted(sheets)[0]

        root = ET.fromstring(z.read(name))

    rows = []
    for row_el in root.iter('{%s}row' % NS_MAIN):
        values = []
        for c in row_el.findall('{%s}c' % NS_MAIN):
            ref = c.get('r') or ''
            col = _col_index(_split_ref(ref)[0]) if ref else len(values)
            while len(values) < col:
                values.append('')

            cell_type = c.get('t')
            if cell_type == 'inlineStr':
                text = ''.join(t.text or '' for t in c.iter('{%s}t' % NS_MAIN))
            elif cell_type == 's':
                v = c.find('{%s}v' % NS_MAIN)
                idx = int(v.text) if v is not None and v.text else -1
                text = shared[idx] if 0 <= idx < len(shared) else ''
            else:
                v = c.find('{%s}v' % NS_MAIN)
                text = v.text if v is not None and v.text else ''
            values.append(text)
        rows.append(values)

    return rows
