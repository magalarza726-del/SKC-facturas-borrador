from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

path=Path(__file__).with_name('.tmp-official.xlsx')
if not path.exists(): raise SystemExit('Missing generated Excel smoke file')
with ZipFile(path) as z:
    required={'[Content_Types].xml','xl/workbook.xml','xl/styles.xml','xl/worksheets/sheet1.xml'}
    missing=required-set(z.namelist())
    if missing: raise SystemExit(f'Missing XLSX parts: {sorted(missing)}')
    styles=z.read('xl/styles.xml').decode('utf-8')
    sheet=z.read('xl/worksheets/sheet1.xml').decode('utf-8')
    if 'FF0B67B2' not in styles: raise SystemExit('Official blue header style is missing')
    if 'd/m/yyyy' not in styles: raise SystemExit('Official day/month/year date format is missing')
    if 'A1:Q3' not in sheet: raise SystemExit('Unexpected official Excel dimension/autofilter')
    if 'ySplit="1"' not in sheet: raise SystemExit('Frozen header is missing')
    ET.fromstring(styles); ET.fromstring(sheet)
path.unlink()
print('EXCEL OOXML VALIDATION OK')
