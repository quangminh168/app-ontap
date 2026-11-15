import type { Question, TopicStat } from '@/lib/types';

/** Tóm tắt điểm + kết quả theo chủ đề */
export function ScoreSummary({
  score,
  total,
  stats,
  caption,
}: {
  score: number;
  total: number;
  stats: TopicStat[];
  caption?: string;
}) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const verdict =
    pct >= 85 ? 'Rất vững.' : pct >= 65 ? 'Khá ổn, còn vài chỗ cần xem lại.' : pct >= 40 ? 'Cần ôn thêm các chủ đề bên dưới.' : 'Nên đọc lại tài liệu trước khi làm tiếp.';
  return (
    <section className="card summary">
      <div className="score" aria-label={`Điểm ${score} trên ${total}`}>
        {score}<small>/{total}</small>
      </div>
      <div>
        <h2>{pct}% câu đúng. {verdict}</h2>
        {caption && <p className="small muted" style={{ marginTop: 4 }}>{caption}</p>}
      </div>
      {stats.length > 0 && (
        <div className="bars">
          <span className="lab">Kết quả theo chủ đề (chủ đề yếu nhất ở trên)</span>
          {stats.map((t) => (
            <div className="brow" key={t.topic}>
              <span className="name">{t.topic}</span>
              <div className="track" role="img" aria-label={`${t.correct} trên ${t.total} câu đúng`}>
                <div className="fill" style={{ width: `${Math.round((t.correct / t.total) * 100)}%` }} />
              </div>
              <span className="mono val">{t.correct}/{t.total}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Xem lại từng câu với đáp án đúng và giải thích */
export function AnswerReview({ questions, answers }: { questions: Question[]; answers: number[] }) {
  return (
    <div className="stack">
      {questions.map((q, i) => {
        const picked = answers[i] ?? -1;
        const verdict =
          picked < 0 ? <span className="verdict no">Chưa trả lời</span>
          : picked === q.answer ? <span className="verdict ok">Đúng</span>
          : <span className="verdict no">Sai</span>;
        return (
          <div key={q.id ?? i} className="qcard final">
            <div className="q-top">
              <span className="mono lab">Câu {i + 1}/{questions.length}</span>
              <span className="chip">{q.topic}</span>
              {verdict}
            </div>
            <p className="qtext">{q.q}</p>
            <div className="opts">
              {q.options.map((text, o) => {
                let cls = 'opt';
                let tag = '';
                if (o === q.answer) { cls += ' right'; tag = 'Đáp án đúng'; }
                else if (picked === o) { cls += ' wrong'; tag = 'Bạn chọn'; }
                return (
                  <div key={o} className={cls}>
                    <span className="mark">{q.type === 'tf' ? (o === 0 ? 'Đ' : 'S') : 'ABCDEF'.charAt(o)}</span>
                    <span className="otext">{text}</span>
                    {tag && <span className="tag">{tag}</span>}
                  </div>
                );
              })}
            </div>
            {q.explain && (
              <div className="explain"><span className="lab">Giải thích</span>{q.explain}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
