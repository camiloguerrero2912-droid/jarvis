'use strict';

/* Cartas: toma el texto que redacta la IA y lo entrega como archivo Word (.docx) y/o Google Doc. */
const Carta = (() => {
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lineas = s => String(s || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  function bloques(c) {
    const B = [];
    const add = (text, o = {}) => B.push({ text, align: o.align || 'left', after: o.after ?? 200, bold: !!o.bold });
    if (c.fecha_lugar) add(c.fecha_lugar, { align: 'right', after: 360 });
    const dest = lineas(c.destinatario);
    dest.forEach((t, i) => add(t, { after: i === dest.length - 1 ? 240 : 0 }));
    if (c.asunto) add('Asunto: ' + c.asunto, { bold: true, after: 240 });
    if (c.saludo) add(c.saludo);
    String(c.cuerpo || '').split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
      .forEach(p => add(p, { align: 'both' }));
    if (c.despedida) add(c.despedida, { after: 720 });
    lineas(c.firma).forEach((t, i) => add(t, { after: 0, bold: i === 0 }));
    return B;
  }

  function docxXml(B) {
    const ps = B.map(b =>
      `<w:p><w:pPr><w:spacing w:after="${b.after}" w:line="276" w:lineRule="auto"/><w:jc w:val="${b.align}"/></w:pPr>` +
      `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${b.bold ? '<w:b/>' : ''}<w:sz w:val="24"/></w:rPr>` +
      `<w:t xml:space="preserve">${esc(b.text)}</w:t></w:r></w:p>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ps +
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';
  }

  async function construir(B, type, Z) {
    Z = Z || window.JSZip;
    if (!Z) throw new Error('No cargó la librería para crear Word. Revisa tu conexión.');
    const z = new Z();
    z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file('word/document.xml', docxXml(B));
    return z.generateAsync({ type, mimeType: MIME, compression: 'DEFLATE' });
  }

  function html(B, titulo) {
    const ps = B.map(b =>
      `<p style="text-align:${b.align === 'both' ? 'justify' : b.align};margin:0 0 ${Math.round(b.after / 20)}pt 0;font-family:Calibri,Arial;font-size:12pt;${b.bold ? 'font-weight:bold;' : ''}">${esc(b.text)}</p>`).join('');
    return `<html><head><meta charset="utf-8"><title>${esc(titulo)}</title></head><body>${ps}</body></html>`;
  }

  async function crear(c) {
    const fmt = c.formato === 'word' || c.formato === 'google_doc' ? c.formato : 'ambos';
    const B = bloques(c);
    if (!B.length) return 'La carta quedó vacía, no se creó nada.';
    const nombre = ('Carta ' + (c.asunto || '')).trim().slice(0, 60);
    const out = [];

    if (fmt !== 'google_doc') {
      const blob = await construir(B, 'blob');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombre.replace(/[\\/:*?"<>|]/g, '') + '.docx';
      document.body.appendChild(a); a.click(); a.remove();
      out.push('Archivo Word descargado: ' + a.download + '.');
      if (typeof PC !== 'undefined' && PC.configured()) {
        await new Promise(r => setTimeout(r, 2500));
        try { out.push(await PC.ejecutar({ accion: 'abrir_descarga', objetivo: a.download })); }
        catch (e) { out.push('No pude abrirla en Word: ' + e.message); }
      }
    }
    if (fmt !== 'word') {
      if (!G.configured()) out.push('No creé el Google Doc porque Google no está configurado en Ajustes.');
      else {
        try {
          const link = await G.crearDoc(nombre, html(B, nombre));
          window.open(link, '_blank', 'noopener');
          out.push('Google Doc creado en tu Drive: ' + link);
        } catch (e) { out.push('No pude crear el Google Doc: ' + e.message + ' Pulsa el botón Drive de arriba para dar el permiso y repite la orden.'); }
      }
    }
    return out.join(' ');
  }

  /* ---------- Hojas de cálculo: .xlsx y Google Sheets ---------- */
  const col = n => { let s = ''; n++; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const num = v => (typeof v === 'number' ? v : typeof v === 'string' && /^-?(0|[1-9]\d*)([.,]\d+)?$/.test(v.trim()) ? Number(v.trim().replace(',', '.')) : v);

  function sheetXml(cols, rows) {
    const cell = (v, r, c, head) => {
      v = num(v);
      const ref = `<c r="${col(c)}${r}"${head ? ' s="1"' : ''}`;
      return typeof v === 'number' && isFinite(v) ? `${ref}><v>${v}</v></c>` : `${ref} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    };
    const all = [cols, ...rows];
    const n = Math.max(...all.map(r => r.length), 1);
    const sd = all.map((r, i) => `<row r="${i + 1}">${r.map((v, k) => cell(v, i + 1, k, i === 0)).join('')}</row>`).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<cols><col min="1" max="${n}" width="20" customWidth="1"/></cols><sheetData>${sd}</sheetData></worksheet>`;
  }

  async function xlsxBlob(cols, rows, Z) {
    Z = Z || window.JSZip;
    if (!Z) throw new Error('No cargó la librería para crear Excel. Revisa tu conexión.');
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const z = new Z();
    z.file('[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>');
    z.file('_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    z.file('xl/workbook.xml', X + `<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    z.file('xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file('xl/styles.xml', X + `<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
    z.file('xl/worksheets/sheet1.xml', sheetXml(cols, rows));
    return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  async function hoja(c) {
    const cols = Array.isArray(c.columnas) ? c.columnas : [];
    const rows = Array.isArray(c.filas) ? c.filas.map(f => (Array.isArray(f) ? f : [f])) : [];
    if (!cols.length && !rows.length) return 'La hoja quedó vacía, no se creó nada.';
    const fmt = c.formato === 'excel' || c.formato === 'google_sheets' ? c.formato : 'ambos';
    const nombre = ('Hoja ' + (c.nombre || '')).trim().slice(0, 60).replace(/[\\/:*?"<>|]/g, '');
    const out = [];
    if (fmt !== 'google_sheets') {
      const bytes = await xlsxBlob(cols, rows);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = nombre + '.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      out.push('Archivo Excel descargado: ' + a.download + '.');
      if (typeof PC !== 'undefined' && PC.configured()) {
        await new Promise(r => setTimeout(r, 2500));
        try { out.push(await PC.ejecutar({ accion: 'abrir_descarga', objetivo: a.download })); }
        catch (e) { out.push('No pude abrirla en Excel: ' + e.message); }
      }
    }
    if (fmt !== 'excel') {
      if (!G.configured()) out.push('No creé la hoja de Google porque Google no está configurado en Ajustes.');
      else {
        try {
          const csv = [cols, ...rows].map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
          const link = await G.crearHoja(nombre, csv);
          window.open(link, '_blank', 'noopener');
          out.push('Hoja de Google creada en tu Drive: ' + link);
        } catch (e) { out.push('No pude crear la hoja de Google: ' + e.message + ' Pulsa el botón Drive de arriba para dar el permiso y repite la orden.'); }
      }
    }
    return out.join(' ');
  }

  return { crear, hoja, _bloques: bloques, _construir: construir, _xlsx: xlsxBlob };
})();
