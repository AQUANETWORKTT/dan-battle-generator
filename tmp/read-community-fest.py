import zipfile,xml.etree.ElementTree as E,json
p=r'C:/Users/james/Downloads/Community FEST 2026 EOY For Creators_REGION_POWER_2026_11_25 00_08 UTC+0.xlsx'
n={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(p) as z:
 ss=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  ss=[''.join(x.itertext()) for x in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',n)]
 wb=E.fromstring(z.read('xl/workbook.xml'));rels={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 out=[]
 for sh in wb.find('m:sheets',n):
  target=rels[sh.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  root=E.fromstring(z.read(target));rows=[]
  for row in root.findall('.//m:sheetData/m:row',n):
   cells={}
   for c in row.findall('m:c',n):
    v=c.find('m:v',n);value=v.text if v is not None else ''.join(c.find('m:is',n).itertext()) if c.find('m:is',n) is not None else ''
    if c.attrib.get('t')=='s':value=ss[int(value)]
    if value:cells[c.attrib['r']]=value
   if cells:rows.append(cells)
  out.append({'sheet':sh.attrib['name'],'rows':rows})
 open('tmp/community-fest-round-two-source.json','w',encoding='utf-8').write(json.dumps(out,ensure_ascii=False,indent=2))
 for sh in out:
  print(sh['sheet'],len(sh['rows']));print(json.dumps(sh['rows'][:8],ensure_ascii=False))
