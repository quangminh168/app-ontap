// src/lib/extract.ts
// Đọc chữ từ tệp tài liệu: PDF, DOCX, TXT, MD.
import { extractText as pdfExtract, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';

export const ALLOWED_EXT = ['pdf', 'docx', 'txt', 'md'] as const;
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel Hobby giới hạn body khoảng 4,5 MB
export const MAX_TEXT_CHARS = 300_000;

export class ExtractError extends Error {}

export function fileExt(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function clean(s: string): string {
  return s
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractTextFromFile(
  buf: Buffer,
  filename: string
): Promise<{ text: string; truncated: boolean }> {
  const ext = fileExt(filename);
  if (!(ALLOWED_EXT as readonly string[]).includes(ext)) {
    throw new ExtractError(
      ext === 'doc'
        ? 'Chưa đọc được tệp .doc cũ. Hãy mở bằng Word và lưu lại thành .docx.'
        : 'Chỉ hỗ trợ tệp PDF, DOCX, TXT, MD.'
    );
  }
  if (buf.length > MAX_FILE_BYTES) throw new ExtractError('Tệp quá lớn (tối đa 4 MB).');

  let raw = '';
  try {
    if (ext === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await pdfExtract(pdf, { mergePages: true });
      raw = Array.isArray(text) ? text.join('\n') : text;
    } else if (ext === 'docx') {
      raw = (await mammoth.extractRawText({ buffer: buf })).value;
    } else {
      raw = buf.toString('utf-8');
    }
  } catch {
    throw new ExtractError('Không đọc được tệp này. Tệp có thể bị hỏng hoặc đặt mật khẩu.');
  }

  const text = clean(raw);
  if (text.length < 50) {
    throw new ExtractError(
      ext === 'pdf'
        ? 'Không tìm thấy chữ trong PDF. Có thể đây là PDF dạng ảnh quét (scan), hiện chưa hỗ trợ.'
        : 'Tệp không có đủ nội dung chữ.'
    );
  }
  const truncated = text.length > MAX_TEXT_CHARS;
  return { text: truncated ? text.slice(0, MAX_TEXT_CHARS) : text, truncated };
}
