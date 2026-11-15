import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel giới hạn body khoảng 4,5 MB

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const f = form?.get('file');
  if (!(f instanceof File)) return NextResponse.json({ error: 'Không nhận được tệp.' }, { status: 400 });
  if (f.size > MAX_BYTES) return NextResponse.json({ error: 'Tệp quá lớn (tối đa 4 MB).' }, { status: 413 });

  const name = f.name.toLowerCase();
  const buf = Buffer.from(await f.arrayBuffer());
  try {
    let text = '';
    if (name.endsWith('.docx')) {
      const m: any = await import('mammoth');
      const r = await (m.default ?? m).extractRawText({ buffer: buf });
      text = r.value;
    } else if (name.endsWith('.pdf')) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const r = await extractText(pdf, { mergePages: true });
      text = r.text as string;
    } else {
      return NextResponse.json({ error: 'Chỉ đọc được PDF, DOCX, TXT hoặc MD.' }, { status: 400 });
    }
    text = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Không đọc được chữ trong tệp. Có thể đây là bản scan hoặc ảnh, hãy sao chép nội dung và dán vào.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: text.slice(0, 200000) });
  } catch {
    return NextResponse.json({ error: 'Không đọc được tệp này.' }, { status: 422 });
  }
}
