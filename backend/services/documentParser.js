const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

/**
 * Extract text from a file based on its MIME type.
 */
async function extractText(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);

  switch (mimeType) {
    // ── PDF ──────────────────────────────────────────────────────────
    case 'application/pdf': {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    }

    // ── DOCX ─────────────────────────────────────────────────────────
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // ── DOC (older Word — best-effort via mammoth) ───────────────────
    case 'application/msword': {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch {
        return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    }

    // ── Plain text / Markdown / CSV ──────────────────────────────────
    case 'text/plain':
    case 'text/markdown':
    case 'text/csv': {
      return buffer.toString('utf-8');
    }

    // ── Excel (XLS / XLSX) ───────────────────────────────────────────
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        return `--- Sheet: ${name} ---\n${csv}`;
      });
      return sheets.join('\n\n');
    }

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

module.exports = { extractText };
