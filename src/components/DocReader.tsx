'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createAnnotation, updateAnnotation, deleteAnnotation, type Ann } from '@/app/docs/[id]/actions';

const COLORS = [
  { k: 'yellow', t: 'Vàng' },
  { k: 'green', t: 'Xanh lá' },
  { k: 'pink', t: 'Hồng' },
  { k: 'blue', t: 'Xanh dương' },
];

export default function DocReader({ docId, content, initial }: { docId: string; content: string; initial: Ann[] }) {
  const [anns, setAnns] = useState<Ann[]>(initial);
  const [sel, setSel] = useState<{ start: number; end: number } | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const cur = anns.find((a) => a.id === selId) ?? null;
  useEffect(() => setDraft(cur?.note ?? ''), [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chia nội dung thành các đoạn nhỏ theo ranh giới của các đánh dấu
  const segs = useMemo(() => {
    const cuts = new Set<number>([0, content.length]);
    anns.forEach((a) => {
      cuts.add(Math.min(a.start, content.length));
      cuts.add(Math.min(a.end, content.length));
    });
    const pts = Array.from(cuts).sort((a, b) => a - b);
    const out: { s: number; e: number; top?: Ann }[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const s = pts[i], e = pts[i + 1];
      if (e <= s) continue;
      let top: Ann | undefined;
      for (const a of anns) if (a.start <= s && a.end >= e) top = a; // đánh dấu mới nhất nằm trên
      out.push({ s, e, top });
    }
    return out;
  }, [anns, content]);

  // Theo dõi vùng người dùng bôi đen
  useEffect(() => {
    function onSel() {
      const s = window.getSelection();
      const box = boxRef.current;
      if (!s || !box || s.rangeCount === 0 || s.isCollapsed) { setSel(null); return; }
      const r = s.getRangeAt(0);
      if (!box.contains(r.commonAncestorContainer)) { setSel(null); return; }
      let start = Infinity, end = -1;
      box.querySelectorAll<HTMLElement>('[data-s]').forEach((sp) => {
        if (!r.intersectsNode(sp)) return;
        const base = Number(sp.dataset.s);
        const len = sp.textContent?.length ?? 0;
        const tn = sp.firstChild;
        const st = tn === r.startContainer ? base + r.startOffset : sp === r.startContainer ? base + (r.startOffset > 0 ? len : 0) : base;
        const en = tn === r.endContainer ? base + r.endOffset : sp === r.endContainer ? base + (r.endOffset > 0 ? len : 0) : base + len;
        if (en > st) { start = Math.min(start, st); end = Math.max(end, en); }
      });
      if (end > start && start !== Infinity) { setSel({ start, end }); setSelId(null); } else setSel(null);
    }
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  async function addHighlight(color: string, openNote = false) {
    if (!sel || busy) return;
    setBusy(true); setErr('');
    const r = await createAnnotation({
      docId, start: sel.start, end: sel.end, color,
      quote: content.slice(sel.start, sel.end),
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setAnns((p) => [...p, r.a]);
    window.getSelection()?.removeAllRanges();
    setSel(null);
    if (openNote) setSelId(r.a.id);
  }

  async function patch(p: { color?: string; note?: string }) {
    if (!cur || busy) return;
    setBusy(true); setErr('');
    const r = await updateAnnotation(cur.id, p);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setAnns((list) => list.map((a) => (a.id === r.a.id ? r.a : a)));
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setErr('');
    const r = await deleteAnnotation(id);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setAnns((list) => list.filter((a) => a.id !== id));
    if (selId === id) setSelId(null);
  }

  function onClickText(e: React.MouseEvent) {
    if (!window.getSelection()?.isCollapsed) return;
    const el = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    setSelId(el?.dataset.a ?? null);
  }

  function jump(id: string) {
    setSelId(id);
    boxRef.current?.querySelector(`[data-a="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  const sorted = [...anns].sort((a, b) => a.start - b.start);
  const swatch = (k: string) => <span className={`sw hl-${k}`} aria-hidden="true" />;

  return (
    <div className="reader-layout">
      <div className="card reader-card">
        <p className="small muted" style={{ marginBottom: 12 }}>
          Bôi đen một đoạn để đánh dấu hoặc ghi chú. Chỉ mình bạn thấy các đánh dấu này, tài liệu gốc không bị thay đổi.
        </p>
        <div ref={boxRef} className="reader" onClick={onClickText}>
          {segs.map((g) => (
            <span
              key={g.s}
              data-s={g.s}
              data-a={g.top?.id}
              className={
                g.top
                  ? `hl hl-${g.top.color}${g.top.note ? ' has-note' : ''}${g.top.id === selId ? ' sel' : ''}`
                  : undefined
              }
            >
              {content.slice(g.s, g.e)}
            </span>
          ))}
        </div>
      </div>

      <aside className="card notes-panel" aria-label="Đánh dấu của tôi">
        <h2>Đánh dấu của tôi ({anns.length})</h2>
        {sorted.length === 0 ? (
          <p className="small muted">Chưa có đánh dấu nào.</p>
        ) : (
          <div className="notes-list">
            {sorted.map((a) => (
              <button key={a.id} type="button" className={'note-item' + (a.id === selId ? ' on' : '')} onClick={() => jump(a.id)}>
                <span className="note-quote">{swatch(a.color)}{a.quote.length > 90 ? a.quote.slice(0, 90) + '…' : a.quote}</span>
                {a.note && <span className="note-text">{a.note}</span>}
              </button>
            ))}
          </div>
        )}
      </aside>

      {sel && (
        <div className="selbar" role="toolbar" aria-label="Đánh dấu đoạn đã chọn" onMouseDown={(e) => e.preventDefault()} onPointerDown={(e) => e.preventDefault()}>
          <span className="small muted">Đã chọn {(sel.end - sel.start).toLocaleString('vi-VN')} ký tự</span>
          {COLORS.map((c) => (
            <button key={c.k} type="button" className="cbtn" disabled={busy} onClick={() => addHighlight(c.k)}>
              {swatch(c.k)}{c.t}
            </button>
          ))}
          <button type="button" className="btn sm" disabled={busy} onClick={() => addHighlight('yellow', true)}>Ghi chú</button>
          {err && <span className="small warn">{err}</span>}
        </div>
      )}

      {!sel && cur && (
        <div className="selbar editor" role="dialog" aria-label="Sửa đánh dấu">
          <div className="small muted note-quote-line">{cur.quote.length > 120 ? cur.quote.slice(0, 120) + '…' : cur.quote}</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ghi chú của bạn (không bắt buộc)"
            maxLength={2000}
            rows={3}
            style={{ minHeight: 70 }}
          />
          <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
            {COLORS.map((c) => (
              <button key={c.k} type="button" className={'cbtn' + (cur.color === c.k ? ' on' : '')} disabled={busy} onClick={() => patch({ color: c.k })}>
                {swatch(c.k)}{c.t}
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <button type="button" className="btn sm" disabled={busy || draft === cur.note} onClick={() => patch({ note: draft })}>Lưu ghi chú</button>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => remove(cur.id)} style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }}>Xóa đánh dấu</button>
            <button type="button" className="btn ghost sm" onClick={() => setSelId(null)}>Đóng</button>
            {err && <span className="small warn">{err}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
