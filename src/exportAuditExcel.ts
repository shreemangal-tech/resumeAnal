import { strToU8, zipSync } from "fflate";
import { deductionCommentText } from "./domain/deductionComments";
import type { ParameterResult } from "./domain/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Resume Audit" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function workbookRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
}

function rootRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function worksheetXml(parameters: ParameterResult[], hasComments: boolean): string {
  const headers = parameters
    .map((parameter, index) => {
      const ref = `${columnName(index)}1`;
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(parameter.displayName)}</t></is></c>`;
    })
    .join("");

  const marks = parameters
    .map((parameter, index) => `<c r="${columnName(index)}2"><v>${parameter.awardedScore}</v></c>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols><col min="1" max="${parameters.length}" width="24" customWidth="1"/></cols>
  <sheetData>
    <row r="1">${headers}</row>
    <row r="2">${marks}</row>
  </sheetData>
  ${hasComments ? '<legacyDrawing r:id="rId2"/>' : ""}
</worksheet>`;
}

function worksheetRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/vmlDrawing1.vml"/>
</Relationships>`;
}

function commentsXml(parameters: ParameterResult[]): string {
  const comments = parameters
    .map((parameter, index) => ({ ref: `${columnName(index)}2`, text: deductionCommentText(parameter) }))
    .filter((item) => item.text.length > 0)
    .map((item) => `<comment ref="${item.ref}" authorId="0"><text><t xml:space="preserve">${escapeXml(item.text)}</t></text></comment>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <authors><author>Resume Audit</author></authors>
  <commentList>${comments}</commentList>
</comments>`;
}

function vmlDrawing(parameters: ParameterResult[]): string {
  const shapes = parameters
    .map((parameter, index) => ({ index, text: deductionCommentText(parameter) }))
    .filter((item) => item.text.length > 0)
    .map(({ index }, shapeIndex) => {
      const shapeId = 1025 + shapeIndex;
      const endColumn = index + 3;
      return `<v:shape id="_x0000_s${shapeId}" type="#_x0000_t202" style="position:absolute;margin-left:59.25pt;margin-top:1.5pt;width:220pt;height:90pt;z-index:${shapeIndex + 1};visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto">
  <v:fill color2="#ffffe1"/>
  <v:shadow on="t" color="black" obscured="t"/>
  <v:path o:connecttype="none"/>
  <v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox>
  <x:ClientData ObjectType="Note">
    <x:MoveWithCells/><x:SizeWithCells/>
    <x:Anchor>${index}, 15, 1, 2, ${endColumn}, 15, 5, 6</x:Anchor>
    <x:AutoFill>False</x:AutoFill>
    <x:Row>1</x:Row><x:Column>${index}</x:Column>
  </x:ClientData>
</v:shape>`;
    })
    .join("");

  return `<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>
<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe">
  <v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/>
</v:shapetype>
${shapes}
</xml>`;
}

function contentTypesXml(hasComments: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasComments ? '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>' : ""}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  ${hasComments ? '<Override PartName="/xl/comments1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>' : ""}
</Types>`;
}

export function buildAuditExcel(parameters: ParameterResult[]): Uint8Array {
  const hasComments = parameters.some((parameter) => deductionCommentText(parameter).length > 0);
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypesXml(hasComments)),
    "_rels/.rels": strToU8(rootRelationshipsXml()),
    "xl/workbook.xml": strToU8(workbookXml()),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelationshipsXml()),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml(parameters, hasComments)),
  };

  if (hasComments) {
    files["xl/worksheets/_rels/sheet1.xml.rels"] = strToU8(worksheetRelationshipsXml());
    files["xl/comments1.xml"] = strToU8(commentsXml(parameters));
    files["xl/drawings/vmlDrawing1.vml"] = strToU8(vmlDrawing(parameters));
  }

  return zipSync(files, { level: 6 });
}

export function downloadAuditExcel(parameters: ParameterResult[]): void {
  const bytes = buildAuditExcel(parameters);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resume-audit.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
