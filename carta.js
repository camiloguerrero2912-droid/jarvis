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
    }
    if (fmt !== 'word') {
      if (!G.configured()) out.push('No creé el Google Doc porque Google no está configurado en Ajustes.');
      else {
        try {
          const link = await G.crearDoc(nombre, html(B, nombre));
          window.open(link, '_blank', 'noopener');
          out.push('Google Doc creado en tu Drive: ' + link);
        } catch (e) { out.push('No pude crear el Google Doc: ' + e.message); }
      }
    }
    return out.join(' ');
  }

  return { crear, _bloques: bloques, _construir: construir };
})();
