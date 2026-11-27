import zipfile, xml.etree.ElementTree as E, json
from pathlib import Path
n={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
files=['Creator data 2026_11_26 17_55 UTC+0.xlsx','Creator data 2026_11_26 17_56 UTC+0.xlsx','Creator data 2026_11_26 17_56 UTC+0 (1).xlsx']
out=[]
for filename in files:
 with zipfile.ZipFile(Path('C:/Users/james/Downloads')/filename) as z:
  strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   strings=[''.join(t.text or '' for t in x.findall('.//m:t',n)) for x in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',n)]
  wb=E.fromstring(z.read('xl/workbook.xml'))
  rels={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  for sheet in wb.find('m:sheets',n):
   target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
   target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
   root=E.fromstring(z.read(target));rows=[]
   for row in root.findall('.//m:sheetData/m:row',n):
    values={}
    for c in row.findall('m:c',n):
     v=c.find('m:v',n);inline=c.find('m:is',n)
     value=v.text if v is not None else ''.join(t.text or '' for t in inline.findall('.//m:t',n)) if inline is not None else ''
     if c.attrib.get('t')=='s':value=strings[int(value)]
     if value:values[c.attrib['r']]=value
    if values:rows.append(values)
   out.append({'file':filename,'sheet':sheet.attrib['name'],'rows':rows})
Path('tmp/departed-creators-source.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8')
