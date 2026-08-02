// 외부 라이브러리 없는 클라이언트 사이드 XLSX 생성

const IMG_ROW_HEIGHT_PT = 20;
const IMG_COL_WIDTH = 18;
const IMG_COL_PX = 7.5;
const PT_TO_PX = 96 / 72;

const CHECKLIST_ITEMS: [string, string][] = [
  ["UI", "화면 load시 최상단 및 입력항목에서 Focus 되는가?"],
  ["UI", "필수 입력항목이 입력안내가 표시되는가?"],
  ["UI", "Enable, Disable 처리가 올바르게 동작하는가?"],
  ["UI", "상태에 따라 버튼, 입력, 표시 처리가 올바르게 되는가?"],
  ["화면", "검색 조건이 올바르게 동작하는가?"],
  ["화면", "페이징 처리가 올바르게 동작하는가?"],
  ["화면", "정렬 기능이 올바르게 동작하는가?"],
  ["입력", "필수 입력값 검증이 올바르게 동작하는가?"],
  ["입력", "입력 type(숫자, 문자, 날짜 등)이 올바르게 동작하는가?"],
  ["입력", "최대 입력길이 제한이 올바르게 동작하는가?"],
  ["보고서 출력", "출력 버튼 클릭시 올바르게 동작하는가?"],
  ["레이아웃", "화면 해상도에 따른 레이아웃이 올바른가?"],
  ["레이아웃", "오류 발생시 오류메시지가 올바르게 표시되는가?"],
];

export interface CaseItem {
  id: string;
  caseNumber: number;
  image: string;        // data URL (png/jpeg)
  testItem: string;
  testContent: string;
  expectedResult: string;
  programId: string;
  verifyMethod: string;
}

export interface ExcelPayload {
  serviceCode: string;
  screenId: string;
  screenName: string;
  author: string;
  capturedAt?: string;
  bizCategory?: string;
  level1?: string;
  level2?: string;
  level3?: string;
  level4?: string;
  cases: CaseItem[];
}

// ── ZIP ──────────────────────────────────────────────────────

let _crcTable: number[] | null = null;
function crcTable() {
  if (_crcTable) return _crcTable;
  _crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  return _crcTable;
}

function crc32(b: Uint8Array): number {
  const t = crcTable();
  let c = 0 ^ -1;
  for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ t[(c ^ b[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function u16(n: number) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
function u32(n: number) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
function enc(s: string) { return new TextEncoder().encode(s); }

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function zip(files: { name: string; data: string | Uint8Array }[]): Uint8Array {
  const dt = new Date();
  const time = (dt.getHours() << 11) | (dt.getMinutes() << 5) | Math.floor(dt.getSeconds() / 2);
  const date = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc(f.name);
    const data = typeof f.data === "string" ? enc(f.data) : f.data;
    const crc = crc32(data);
    const header = concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name]);
    local.push(header, data);
    central.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += header.length + data.length;
  }
  const cd = concat(central);
  return concat([...local, cd, concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)])]);
}

// ── XLSX XML ─────────────────────────────────────────────────

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function colName(n: number) {
  let s = "";
  while (n > 0) { s = String.fromCharCode(64 + ((n - 1) % 26) + 1) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function ref(r: number, c: number) { return colName(c) + r; }
function tc(r: number, c: number, v: string, s?: number) { return `<c r="${ref(r, c)}"${s ? ` s="${s}"` : ""} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`; }
function ec(r: number, c: number, s: number) { return `<c r="${ref(r, c)}" s="${s}"/>`; }
function row(n: number, cells: string[], h?: number) { return `<row r="${n}"${h ? ` ht="${h}" customHeight="1"` : ""}>${cells.join("")}</row>`; }
function merges(ms: string[]) { return ms.length ? `<mergeCells count="${ms.length}">${ms.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""; }
function cols(ws: number[]) { return `<cols>${ws.map((w, i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols>`; }
function rels(rs: { id: string; type: string; target: string }[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rs.map(r => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`).join("")}</Relationships>`;
}
function sheet(ws: number[], rows: string[], ms: string[], drawRel?: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${cols(ws)}<sheetData>${rows.join("")}</sheetData>${merges(ms)}${drawRel ? `<drawing r:id="${drawRel}"/>` : ""}</worksheet>`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };

// ── 시트 빌더 ────────────────────────────────────────────────

function coverSheet(p: ExcelPayload) {
  const rows = [row(1, [tc(1, 1, "단위테스트케이스 결과서", 4)], 44)];
  [["서비스코드", p.serviceCode], ["화면ID", p.screenId], ["화면명", p.screenName], ["작성일", p.capturedAt ?? ""], ["문서버전", "V1.0"]].forEach(([lbl, val], i) => {
    const n = i + 2;
    rows.push(row(n, [tc(n, 1, lbl, 2), tc(n, 2, val, 1)], 24));
  });
  return sheet([20, 45], rows, ["A1:B1"]);
}

function revisionSheet(p: ExcelPayload) {
  return sheet([12, 20, 55, 15], [
    row(1, ["버전", "개정일자", "개정내용", "개정자"].map((h, i) => tc(1, i+1, h, 2)), 22),
    row(2, [tc(2,1,"V1.0",1), tc(2,2,p.capturedAt??"",1), tc(2,3,"최초 작성",1), tc(2,4,p.author,1)], 20),
  ], []);
}

function testCaseSheet(p: ExcelPayload) {
  const mv = [p.bizCategory, p.level1, p.level2, p.level3, p.level4, p.author];
  const r1 = ["업무분류","Level1","Level2","Level3","Level4","작성자"].flatMap((lbl, i) => [tc(1, i*2+1, lbl, 2), tc(1, i*2+2, mv[i]??"", 1)]);
  const rows = [
    row(1, r1, 22),
    row(2, [tc(2,1,"단위테스트ID",2), tc(2,2,`UT_${p.screenId}`,1), tc(2,5,"단위테스트명",2), tc(2,6,p.screenName,1), tc(2,11,"작성일",2), tc(2,12,todayStr(),1)], 22),
    row(3, [tc(3,1,"단위테스트 케이스",5), tc(3,10,"단위테스트 결과",4)], 22),
    row(4, ["케이스번호","테스트항목","테스트내용","테스트데이터","예상결과","프로그램ID","결과확인방법","비고","","수행결과","증빙여부","증빙제외사유"].map((h,i) => tc(4,i+1,h,2)), 22),
  ];
  p.cases.forEach((c, idx) => {
    const n = idx + 5;
    rows.push(row(n, [tc(n,1,pad2(c.caseNumber),3), tc(n,2,c.testItem,1), tc(n,3,c.testContent,1), tc(n,4,"",1), tc(n,5,c.expectedResult,1), tc(n,6,c.programId,1), tc(n,7,c.verifyMethod,1), tc(n,8,"",1), tc(n,9,"",1), tc(n,10,"성공",6), tc(n,11,"Y",1), tc(n,12,"",1)], 20));
  });
  return sheet([12,20,35,20,25,22,22,15,10,14,12,18], rows, ["B2:D2","F2:J2","A3:I3","J3:L3"]);
}

function checklistSheet() {
  const rows = [row(1, [tc(1,1,"공통 체크리스트",4)], 28), row(2, ["프로그램 유형","공통 체크 항목","Y/N/NA"].map((h,i) => tc(2,i+1,h,2)), 22)];
  const ms = ["A1:C1"];
  let cur = "", start = 3;
  CHECKLIST_ITEMS.forEach(([cat, item], i) => {
    const n = i + 3;
    if (cat !== cur) { if (cur && start < n - 1) ms.push(`A${start}:A${n-1}`); cur = cat; start = n; }
    rows.push(row(n, [tc(n,1,n===start?cat:"",3), tc(n,2,item,1), tc(n,3,"NA",3)], 18));
  });
  if (cur && start < CHECKLIST_ITEMS.length + 2) ms.push(`A${start}:A${CHECKLIST_ITEMS.length+2}`);
  return sheet([18,60,10], rows, ms);
}

interface Img { ext: "png"|"jpeg"; bytes: Uint8Array; w: number; h: number }

function parseImg(dataUrl: string): Img {
  const src = dataUrl.replace(/\s/g, "");
  const ext: "png"|"jpeg" = /^data:image\/png;/i.test(src) ? "png" : "jpeg";
  const b64 = src.replace(/^data:image\/(png|jpe?g);base64,/i, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let w = 1000, h = 700;
  if (ext === "png" && bytes.length > 24) {
    w = (bytes[16]<<24)|(bytes[17]<<16)|(bytes[18]<<8)|bytes[19];
    h = (bytes[20]<<24)|(bytes[21]<<16)|(bytes[22]<<8)|bytes[23];
  } else if (ext === "jpeg") {
    let p = 2;
    while (p + 9 < bytes.length) {
      if (bytes[p] !== 0xff) break;
      const mk = bytes[p+1], len = (bytes[p+2]<<8)+bytes[p+3];
      if (mk >= 0xc0 && mk <= 0xc3) { h=(bytes[p+5]<<8)+bytes[p+6]; w=(bytes[p+7]<<8)+bytes[p+8]; break; }
      p += 2 + len;
    }
  }
  return { ext, bytes, w, h };
}

function borderStyle(top: boolean, bot: boolean, left: boolean, right: boolean) {
  if (top&&left) return 12; if (top&&right) return 13;
  if (bot&&left) return 14; if (bot&&right) return 15;
  if (top) return 8; if (bot) return 9; if (left) return 10; if (right) return 11;
  return 0;
}

function evidenceSheet(p: ExcelPayload, imgs: Img[]) {
  const rows = [row(1,[tc(1,1,"단위테스트 결과 증빙",4)],28), row(2,[tc(2,1,"케이스번호",2),tc(2,2,"테스트 결과 증빙",2)],22)];
  const ms = ["A1:I1","B2:I2"];
  const areaW = 8 * IMG_COL_WIDTH * IMG_COL_PX;
  let cur = 3;
  p.cases.forEach((c, idx) => {
    const { w, h } = imgs[idx];
    const numRows = Math.max(10, Math.ceil(areaW * (h / Math.max(w,1)) / (IMG_ROW_HEIGHT_PT * PT_TO_PX)));
    const end = cur + numRows - 1;
    ms.push(`A${cur}:A${end}`);
    for (let r = cur; r <= end; r++) {
      const cells: string[] = r===cur ? [tc(r,1,pad2(c.caseNumber),3)] : [];
      for (let col=2; col<=9; col++) { const s=borderStyle(r===cur,r===end,col===2,col===9); if(s) cells.push(ec(r,col,s)); }
      rows.push(row(r,cells,IMG_ROW_HEIGHT_PT));
    }
    cur = end + 1;
  });
  return sheet([14,...Array(8).fill(IMG_COL_WIDTH)], rows, ms, p.cases.length ? "rId1" : undefined);
}

function drawingXml(p: ExcelPayload, imgs: Img[]) {
  const areaW = 8 * IMG_COL_WIDTH * IMG_COL_PX;
  let cur = 3;
  const anchors = p.cases.map((c, idx) => {
    const { w, h } = imgs[idx];
    const numRows = Math.max(10, Math.ceil(areaW * (h / Math.max(w,1)) / (IMG_ROW_HEIGHT_PT * PT_TO_PX)));
    const end = cur + numRows - 1;
    const xml = `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${cur-1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${end}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${idx+1}" name="Evidence ${idx+1}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${idx+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
    cur = end + 1;
    return xml;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join("")}</xdr:wsDr>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FF1E3A5F"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/></patternFill></fill></fills><borders count="10"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border><border><left/><right/><top style="thin"/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"/><diagonal/></border><border><left style="thin"/><right/><top/><bottom/><diagonal/></border><border><left/><right style="thin"/><top/><bottom/><diagonal/></border><border><left style="thin"/><right/><top style="thin"/><bottom/><diagonal/></border><border><left/><right style="thin"/><top style="thin"/><bottom/><diagonal/></border><border><left style="thin"/><right/><top/><bottom style="thin"/><diagonal/></border><border><left/><right style="thin"/><top/><bottom style="thin"/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="16"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="4" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="5" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="6" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="7" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="8" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="9" xfId="0" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

// ── 공개 API ─────────────────────────────────────────────────

const SHEET_NAMES = ["겉표지","개정이력","단위테스트케이스","공통체크리스트","단위테스트케이스결과증빙"];

export function makeFileName(p: Pick<ExcelPayload, "serviceCode"|"screenId"|"screenName">) {
  return `MAL_${p.serviceCode||"서비스코드"}_AC02(단위테스트케이스결과서)_UT_${p.screenId||"화면ID"}_${p.screenName||"화면명"}_V1.0.xlsx`;
}

export function generateExcel(payload: ExcelPayload): Promise<Uint8Array> {
  const p = {
    ...payload,
    capturedAt: payload.capturedAt ?? todayStr(),
  };
  const imgs = p.cases.map(c => parseImg(c.image));
  const wbRels = [
    ...SHEET_NAMES.map((_, i) => ({ id:`rId${i+1}`, type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet", target:`worksheets/sheet${i+1}.xml` })),
    { id:`rId${SHEET_NAMES.length+1}`, type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles", target:"styles.xml" },
  ];
  const hasImgs = imgs.length > 0;
  const files: { name: string; data: string|Uint8Array }[] = [
    { name:"[Content_Types].xml", data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imgs.some(i=>i.ext==="png") ? '<Default Extension="png" ContentType="image/png"/>' : ""}${imgs.some(i=>i.ext==="jpeg") ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ""}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${SHEET_NAMES.map((_,i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}${hasImgs ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}</Types>` },
    { name:"_rels/.rels", data:rels([{id:"rId1",type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",target:"xl/workbook.xml"}]) },
    { name:"xl/workbook.xml", data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${SHEET_NAMES.map((n,i) => `<sheet name="${esc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>` },
    { name:"xl/_rels/workbook.xml.rels", data:rels(wbRels) },
    { name:"xl/styles.xml", data:stylesXml() },
    { name:"xl/worksheets/sheet1.xml", data:coverSheet(p) },
    { name:"xl/worksheets/sheet2.xml", data:revisionSheet(p) },
    { name:"xl/worksheets/sheet3.xml", data:testCaseSheet(p) },
    { name:"xl/worksheets/sheet4.xml", data:checklistSheet() },
    { name:"xl/worksheets/sheet5.xml", data:evidenceSheet(p,imgs) },
  ];
  if (hasImgs) {
    files.push({ name:"xl/worksheets/_rels/sheet5.xml.rels", data:rels([{id:"rId1",type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",target:"../drawings/drawing1.xml"}]) });
    files.push({ name:"xl/drawings/drawing1.xml", data:drawingXml(p,imgs) });
    files.push({ name:"xl/drawings/_rels/drawing1.xml.rels", data:rels(imgs.map((img,i) => ({id:`rId${i+1}`,type:"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",target:`../media/image${i+1}.${img.ext}`}))) });
    imgs.forEach((img,i) => files.push({ name:`xl/media/image${i+1}.${img.ext}`, data:img.bytes }));
  }
  return Promise.resolve(zip(files));
}
