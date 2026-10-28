/**
 * Pure frontend Excel (.xlsx) file generator without external dependencies.
 * Creates standard OpenXML spreadsheet packages readable by Microsoft Excel,
 * Google Sheets, Apple Numbers, and LibreOffice Calc.
 */

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  footer?: (string | number | null | undefined)[];
}

// Pre-computed CRC32 table
const makeCrcTable = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};

const crcTable = makeCrcTable();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

// Convert column index (0-based) to Excel letters (A, B, ..., Z, AA, AB, ...)
const getColumnLetter = (colIndex: number): string => {
  let temp: number;
  let letter = '';
  let col = colIndex + 1;
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    col = Math.floor((col - temp) / 26);
  }
  return letter;
};

const escapeXml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const createZipArchive = (entries: ZipEntry[]): Uint8Array => {
  const encoder = new TextEncoder();
  let totalLength = 0;

  // Calculate size
  const processed = entries.map(entry => {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    return {
      nameBytes,
      data: entry.data,
      crc,
      localHeaderOffset: 0,
    };
  });

  // Local headers + data
  let offset = 0;
  for (const item of processed) {
    item.localHeaderOffset = offset;
    offset += 30 + item.nameBytes.length + item.data.length;
  }

  // Central directory size
  const cdOffset = offset;
  let cdSize = 0;
  for (const item of processed) {
    cdSize += 46 + item.nameBytes.length;
  }

  // End of Central Directory size: 22 bytes
  totalLength = cdOffset + cdSize + 22;

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);

  // Write local headers & data
  let currentOffset = 0;
  for (const item of processed) {
    view.setUint32(currentOffset, 0x04034b50, true); // Local header signature
    view.setUint16(currentOffset + 4, 20, true); // Version needed (2.0)
    view.setUint16(currentOffset + 6, 0, true); // General flags
    view.setUint16(currentOffset + 8, 0, true); // Compression: Store (0)
    view.setUint16(currentOffset + 10, 0, true); // Mod time
    view.setUint16(currentOffset + 12, 0, true); // Mod date
    view.setUint32(currentOffset + 14, item.crc, true); // CRC32
    view.setUint32(currentOffset + 18, item.data.length, true); // Compressed size
    view.setUint32(currentOffset + 22, item.data.length, true); // Uncompressed size
    view.setUint16(currentOffset + 26, item.nameBytes.length, true); // Filename length
    view.setUint16(currentOffset + 28, 0, true); // Extra field length

    buffer.set(item.nameBytes, currentOffset + 30);
    buffer.set(item.data, currentOffset + 30 + item.nameBytes.length);

    currentOffset += 30 + item.nameBytes.length + item.data.length;
  }

  // Write Central Directory headers
  for (const item of processed) {
    view.setUint32(currentOffset, 0x02014b50, true); // CD header signature
    view.setUint16(currentOffset + 4, 20, true); // Version made by
    view.setUint16(currentOffset + 6, 20, true); // Version needed
    view.setUint16(currentOffset + 8, 0, true); // General flags
    view.setUint16(currentOffset + 10, 0, true); // Compression: Store (0)
    view.setUint16(currentOffset + 12, 0, true); // Mod time
    view.setUint16(currentOffset + 14, 0, true); // Mod date
    view.setUint32(currentOffset + 16, item.crc, true); // CRC32
    view.setUint32(currentOffset + 20, item.data.length, true); // Compressed size
    view.setUint32(currentOffset + 24, item.data.length, true); // Uncompressed size
    view.setUint16(currentOffset + 28, item.nameBytes.length, true); // Filename length
    view.setUint16(currentOffset + 30, 0, true); // Extra field length
    view.setUint16(currentOffset + 32, 0, true); // Comment length
    view.setUint16(currentOffset + 34, 0, true); // Disk start
    view.setUint16(currentOffset + 36, 0, true); // Internal attributes
    view.setUint32(currentOffset + 38, 0, true); // External attributes
    view.setUint32(currentOffset + 42, item.localHeaderOffset, true); // Offset

    buffer.set(item.nameBytes, currentOffset + 46);
    currentOffset += 46 + item.nameBytes.length;
  }

  // Write End of Central Directory Record
  view.setUint32(currentOffset, 0x06054b50, true); // EOCD signature
  view.setUint16(currentOffset + 4, 0, true); // Disk number
  view.setUint16(currentOffset + 6, 0, true); // Start disk
  view.setUint16(currentOffset + 8, processed.length, true); // Disk entries
  view.setUint16(currentOffset + 10, processed.length, true); // Total entries
  view.setUint32(currentOffset + 12, cdSize, true); // CD size
  view.setUint32(currentOffset + 16, cdOffset, true); // CD offset
  view.setUint16(currentOffset + 20, 0, true); // Comment length

  return buffer;
};

/**
 * Builds standard OpenXML files for a multi-sheet or single-sheet workbook and triggers browser download.
 */
export function exportToExcel(filename: string, sheets: ExcelSheet[]): void {
  const encoder = new TextEncoder();
  const safeSheets = sheets.length > 0 ? sheets : [{ name: 'Sheet1', headers: [], rows: [] }];

  // 1. [Content_Types].xml
  let sheetOverrides = '';
  safeSheets.forEach((_, idx) => {
    sheetOverrides += `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  });

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // 3. xl/workbook.xml
  let sheetsXml = '';
  safeSheets.forEach((s, idx) => {
    const sheetName = escapeXml(s.name.substring(0, 31) || `Sheet${idx + 1}`);
    sheetsXml += `<sheet name="${sheetName}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`;
  });

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetsXml}
  </sheets>
</workbook>`;

  // 4. xl/_rels/workbook.xml.rels
  let wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  safeSheets.forEach((_, idx) => {
    wbRelsXml += `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`;
  });
  wbRelsXml += `<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  wbRelsXml += `</Relationships>`;

  // 5. xl/styles.xml (Professional theme matching the application)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><name val="Segoe UI"/><sz val="10"/><color rgb="FF0F172A"/></font>
    <font><b/><name val="Segoe UI"/><sz val="10"/><color rgb="FFFFFFFF"/></font>
    <font><b/><name val="Segoe UI"/><sz val="10"/><color rgb="FF0F172A"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

  // Build zip entries
  const zipEntries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(wbRelsXml) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
  ];

  // 6. Each worksheet: xl/worksheets/sheetN.xml
  safeSheets.forEach((sheet, idx) => {
    let sheetDataXml = '';
    let rowIndex = 1;

    // Header Row
    if (sheet.headers && sheet.headers.length > 0) {
      let headerCells = '';
      sheet.headers.forEach((h, colIdx) => {
        const colLetter = getColumnLetter(colIdx);
        headerCells += `<c r="${colLetter}${rowIndex}" t="inlineStr" s="1"><is><t>${escapeXml(String(h))}</t></is></c>`;
      });
      sheetDataXml += `<row r="${rowIndex}">${headerCells}</row>`;
      rowIndex++;
    }

    // Data Rows
    sheet.rows.forEach(row => {
      let rowCells = '';
      row.forEach((val, colIdx) => {
        const colLetter = getColumnLetter(colIdx);
        if (val === null || val === undefined || val === '') {
          rowCells += `<c r="${colLetter}${rowIndex}" s="0"/>`;
        } else if (typeof val === 'number') {
          rowCells += `<c r="${colLetter}${rowIndex}" s="0"><v>${val}</v></c>`;
        } else {
          rowCells += `<c r="${colLetter}${rowIndex}" t="inlineStr" s="0"><is><t>${escapeXml(String(val))}</t></is></c>`;
        }
      });
      sheetDataXml += `<row r="${rowIndex}">${rowCells}</row>`;
      rowIndex++;
    });

    // Footer Row
    if (sheet.footer && sheet.footer.length > 0) {
      let footerCells = '';
      sheet.footer.forEach((val, colIdx) => {
        const colLetter = getColumnLetter(colIdx);
        if (val === null || val === undefined || val === '') {
          footerCells += `<c r="${colLetter}${rowIndex}" s="2"/>`;
        } else if (typeof val === 'number') {
          footerCells += `<c r="${colLetter}${rowIndex}" s="2"><v>${val}</v></c>`;
        } else {
          footerCells += `<c r="${colLetter}${rowIndex}" t="inlineStr" s="2"><is><t>${escapeXml(String(val))}</t></is></c>`;
        }
      });
      sheetDataXml += `<row r="${rowIndex}">${footerCells}</row>`;
    }

    // Approximate column widths
    const maxCols = Math.max(
      sheet.headers.length,
      ...sheet.rows.map(r => r.length),
      sheet.footer ? sheet.footer.length : 0
    );

    let colsXml = '';
    if (maxCols > 0) {
      colsXml = '<cols>';
      for (let c = 0; c < maxCols; c++) {
        // Generous readable column width (min 16, default 22)
        colsXml += `<col min="${c + 1}" max="${c + 1}" width="22" customWidth="1"/>`;
      }
      colsXml += '</cols>';
    }

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>
    ${sheetDataXml}
  </sheetData>
</worksheet>`;

    zipEntries.push({
      name: `xl/worksheets/sheet${idx + 1}.xml`,
      data: encoder.encode(worksheetXml),
    });
  });

  // Package into zip
  const zipBytes = createZipArchive(zipEntries);

  // Trigger browser download
  const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
