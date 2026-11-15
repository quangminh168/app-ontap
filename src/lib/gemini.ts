// src/lib/gemini.ts
// Gọi Gemini API (Google AI Studio) bằng fetch, không cần cài thêm thư viện.
// Biến môi trường:
//   GEMINI_API_KEY  (bắt buộc) - lấy ở https://aistudio.google.com
//   GEMINI_MODEL    (tùy chọn) - mặc định gemini-2.5-flash; kiểm tra tên model còn dùng được trong AI Studio

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateWithGemini(
  prompt: string,
  opts: { maxRetries?: number; timeoutMs?: number } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('Thiếu GEMINI_API_KEY', 500);

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 50_000; // Vercel Hobby: giữ dưới 60 giây

  const started = Date.now();
  let lastErr: GeminiError = new GeminiError('Lỗi không xác định', 500);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining < 5_000) break;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), remaining);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json', // ép trả về JSON
          },
        }),
        signal: ctrl.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? '')
          .join('');
        if (!text.trim()) {
          const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'rỗng';
          throw new GeminiError(`AI không trả về nội dung (${reason})`, 502);
        }
        return text;
      }

      const body = await res.text().catch(() => '');
      lastErr = new GeminiError(`Gemini ${res.status}: ${body.slice(0, 300)}`, res.status);
      // Chỉ thử lại khi quá tải hoặc hết hạn mức tạm thời
      if (res.status !== 429 && res.status !== 503) throw lastErr;
      await sleep(1500 * (attempt + 1));
    } catch (e) {
      if (e instanceof GeminiError && e.status !== 429 && e.status !== 503) throw e;
      if ((e as Error).name === 'AbortError') throw new GeminiError('AI phản hồi quá lâu', 504);
      if (e instanceof GeminiError) lastErr = e;
      else throw new GeminiError((e as Error).message, 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Thông báo thân thiện cho người dùng theo mã lỗi. */
export function friendlyMessage(e: unknown): string {
  const status = e instanceof GeminiError ? e.status : 500;
  if (status === 429) return 'Hệ thống AI đang quá tải hoặc hết lượt miễn phí hôm nay. Vui lòng thử lại sau ít phút.';
  if (status === 504) return 'AI phản hồi quá lâu. Hãy thử tạo ít câu hơn (5 câu).';
  return 'Không tạo được đề lúc này. Vui lòng thử lại.';
}
