import type { EssayGrade, Question } from '@/lib/types';

export interface EssayItem {
  n: number; // số thứ tự trong phần tự luận
  q: Question;
  answer: string;
  grade?: EssayGrade;
}

const fmt = (x: number) => String(x).replace('.', ',');
const lab = { fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' as const, opacity: 0.65, marginBottom: 4 };
const box = { padding: '10px 12px', borderRadius: 10, background: 'rgba(120,130,160,0.10)', whiteSpace: 'pre-wrap' as const, margin: 0 };

// Xem lại câu tự luận: bài làm, điểm, nhận xét của AI, đáp án mẫu và các ý chấm
export default function EssayReview({ items, mine }: { items: EssayItem[]; mine: boolean }) {
  const ungraded = items.filter((it) => it.grade && !it.grade.graded).length;
  return (
    <div className="stack">
      {ungraded > 0 && (
        <p className="warn" role="status">
          {ungraded} câu tự luận chưa được AI chấm (hệ thống đang bận hoặc gặp lỗi), tạm tính 0 điểm. Bạn có thể làm lại đề để được chấm lại.
        </p>
      )}
      {items.map((it) => {
        const g = it.grade;
        return (
          <div key={it.q.id} className="qcard">
            <div className="q-top">
              <span className="mono lab">Câu tự luận {it.n}</span>
              <span className="chip">{it.q.topic}</span>
              <span className="chip">{g && g.graded ? `${fmt(g.score)}/1 điểm` : 'Chưa chấm được'}</span>
            </div>
            <p className="qtext">{it.q.q}</p>

            <div style={{ marginTop: 12 }}>
              <div className="mono" style={lab}>{mine ? 'Bài làm của bạn' : 'Bài làm của học sinh'}</div>
              <p style={box}>{it.answer || 'Chưa làm câu này.'}</p>
            </div>

            {g && g.graded && g.feedback && (
              <div style={{ marginTop: 12 }}>
                <div className="mono" style={lab}>Nhận xét của AI</div>
                <p style={{ margin: 0 }}>{g.feedback}</p>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <div className="mono" style={lab}>Đáp án mẫu</div>
              <p style={box}>{it.q.sample}</p>
              {!!it.q.points?.length && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {it.q.points.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ul>
              )}
              {it.q.explain && <p className="small muted" style={{ marginTop: 8 }}>{it.q.explain}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
