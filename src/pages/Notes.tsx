import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pin, PinOff, Pencil, Trash2, StickyNote, Copy, Check,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, Btn, Empty, Confirm } from '../components/ui';
import { NoteModal } from '../components/forms';
import type { Note } from '../lib/types';
import { cx } from '../lib/utils';
import { toFa, formatJalali } from '../lib/jalali';

export default function Notes() {
  const { state, updateNote, deleteNote } = useApp();
  const [q, setQ] = useState('');
  const [tagF, setTagF] = useState('همه');
  const [showM, setShowM] = useState(false);
  const [edit, setEdit] = useState<Note | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const tags = useMemo(() => {
    const s = new Set<string>();
    for (const n of state.notes) for (const t of n.tags) s.add(t);
    return ['همه', ...[...s].sort()];
  }, [state.notes]);

  const list = useMemo(() => {
    let arr = [...state.notes];
    if (tagF !== 'همه') arr = arr.filter((n) => n.tags.includes(tagF));
    const needle = q.trim();
    if (needle) arr = arr.filter((n) => n.title.includes(needle) || n.body.includes(needle));
    return arr.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [state.notes, tagF, q]);

  const copy = async (n: Note) => {
    try {
      await navigator.clipboard.writeText(`${n.title}\n${n.body}`);
      setCopied(n.id);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* کلیپ‌برد در دسترس نیست */ }
  };

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جست‌وجو در یادداشت‌ها…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 pr-9 text-[13px] outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:focus:bg-slate-900"
            />
          </div>
          <div className="flex max-w-full gap-1.5 overflow-x-auto">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTagF(t)}
                className={cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition',
                  tagF === t ? 'bg-slate-900 text-white dark:bg-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300',
                )}
              >
                {t === 'همه' ? `همه (${toFa(state.notes.length)})` : t}
              </button>
            ))}
          </div>
          <Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> یادداشت جدید</Btn>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<StickyNote size={26} />}
            title={state.notes.length === 0 ? 'هنوز یادداشتی نداری' : 'چیزی پیدا نشد'}
            sub="ایده‌ها، لیست‌ها و نکته‌های مهم را اینجا نگه دار"
            action={<Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> نوشتن یادداشت</Btn>}
          />
        </Card>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 [&>*]:mb-4">
          {list.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="group break-inside-avoid rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-white/10 dark:bg-slate-900"
              style={{ background: `linear-gradient(180deg, ${n.color}55 0%, transparent 90px)` }}
            >
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-sm font-black leading-6 text-slate-800 dark:text-slate-100">{n.title}</h3>
                <button
                  onClick={() => updateNote(n.id, { pinned: !n.pinned })}
                  title={n.pinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}
                  className={cx(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-lg transition',
                    n.pinned ? 'bg-amber-500/15 text-amber-500' : 'text-slate-300 opacity-0 hover:bg-slate-100 hover:text-amber-500 group-hover:opacity-100 dark:hover:bg-white/10',
                  )}
                >
                  {n.pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
                </button>
              </div>
              {n.body && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-6 text-slate-600 dark:text-slate-300">
                  {n.body.length > 320 ? n.body.slice(0, 320) + '…' : n.body}
                </p>
              )}
              {n.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {n.tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTagF(t)}
                      className="rounded-md bg-slate-900/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 transition hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300"
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-white/5">
                <span className="text-[10px] text-slate-400">{formatJalali(n.updatedAt)}</span>
                <span className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => copy(n)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10" title="کپی متن">
                    {copied === n.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => { setEdit(n); setShowM(true); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setConfirmId(n.id)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف">
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <NoteModal open={showM} onClose={() => setShowM(false)} edit={edit} />
      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteNote(confirmId)} title="حذف یادداشت؟" desc="این یادداشت برای همیشه حذف می‌شود." />
    </div>
  );
}
