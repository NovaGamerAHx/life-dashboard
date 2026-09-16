import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Wallet, TrendingUp, TrendingDown,
  PiggyBank, Download, ChevronRight, ChevronLeft, Tags, Receipt,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { useMoney } from '../lib/money';
import {
  toJalaali, J_MONTHS, toFa, formatJalali, startOfDay,
  formatTime, smartDate, toGregorian, jalaaliMonthLength,
  startOfDay as sod,
} from '../lib/jalali';
import { sumTx, groupByCategory, exportRowsCsv, downloadText } from '../lib/stats';
import { CAT_COLORS, type Transaction } from '../lib/types';
import { Card, CardHead, Btn, Badge, Empty, Progress, Modal, Field, inputCls, Segmented, Confirm } from '../components/ui';
import { Donut, Legend, Bars } from '../components/charts';
import { TxModal } from '../components/forms';
import { catEmoji } from './Dashboard';
import { cx, parseAmount } from '../lib/utils';

type Tab = 'all' | 'expense' | 'income';

export default function Finance() {
  const { state, deleteTransaction, deleteBudget, addCategory, deleteCategory } = useApp();
  const { withUnit, fmt } = useMoney();

  const curJ = toJalaali(new Date());
  const [jy, setJy] = useState(curJ.jy);
  const [jm, setJm] = useState(curJ.jm);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [catF, setCatF] = useState<string>('همه');
  const [showTx, setShowTx] = useState(false);
  const [edit, setEdit] = useState<Transaction | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showBudget, setShowBudget] = useState(false);
  const [showCats, setShowCats] = useState(false);

  // بازه ماه انتخابی (شمسی دقیق)
  const range = useMemo(() => calcRange(jy, jm, toGregorian), [jy, jm]);

  const monthTx = useMemo(
    () => state.transactions.filter((t) => t.date >= range.startTs && t.date <= range.endTs),
    [state.transactions, range],
  );
  const inc = sumTx(monthTx, 'income');
  const exp = sumTx(monthTx, 'expense');

  const groups = useMemo(() => groupByCategory(monthTx.filter((t) => t.type === 'expense')), [monthTx]);
  const donut = groups.slice(0, 7).map((g) => ({
    label: g.category, value: g.value, color: CAT_COLORS[g.category] ?? '#64748b',
  }));

  // نمودار روزانه ماه
  const monthDays = useMemo(() => {
    const arr: Array<{ label: string; value: number }> = [];
    const len: number = jalaaliMonthLength(jy, jm);
    for (let d = 1; d <= len; d++) {
      const g = toGregorian(jy, jm, d).getTime();
      const dayS = startOfDay(g);
      const v = monthTx.reduce((a, t) => (t.type === 'expense' && startOfDay(t.date) === dayS ? a + t.amount : a), 0);
      arr.push({ label: toFa(d), value: v });
    }
    return arr;
  }, [jy, jm, monthTx]);

  const cats = useMemo(() => {
    const s = new Set(monthTx.map((t) => t.category));
    return ['همه', ...[...s].sort()];
  }, [monthTx]);

  const list = useMemo(() => {
    let arr = [...monthTx].sort((a, b) => b.date - a.date);
    if (tab !== 'all') arr = arr.filter((t) => t.type === tab);
    if (catF !== 'همه') arr = arr.filter((t) => t.category === catF);
    const needle = q.trim();
    if (needle) arr = arr.filter((t) => t.title.includes(needle) || t.category.includes(needle) || (t.note ?? '').includes(needle));
    return arr;
  }, [monthTx, tab, catF, q]);

  // گروه‌بندی روزانه برای نمایش
  const grouped = useMemo(() => {
    const m = new Map<number, Transaction[]>();
    for (const t of list) {
      const k = startOfDay(t.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [list]);

  const shiftMonth = (d: number) => {
    let ny = jy, nm = jm + d;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setJy(ny); setJm(nm);
  };

  const exportCsv = () => {
    const rows = list.map((t) => ({
      تاریخ: formatJalali(t.date),
      ساعت: new Date(t.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      نوع: t.type === 'income' ? 'درآمد' : 'هزینه',
      عنوان: t.title,
      دسته: t.category,
      مبلغ_تومان: t.amount,
      یادداشت: t.note ?? '',
    }));
    downloadText(`transactions-${jy}-${jm}.csv`, exportRowsCsv(rows));
  };

  return (
    <div className="space-y-5">
      {/* هدر ماه */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 bg-gradient-to-l from-emerald-600 to-teal-600 px-5 py-4 text-white">
          <button onClick={() => shiftMonth(-1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="ماه قبل">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-lg font-black">{J_MONTHS[jm - 1]} {toFa(jy)}</h2>
            <p className="text-[11px] text-emerald-100">{toFa(monthTx.length)} تراکنش • مانده {withUnit(inc - exp)}</p>
          </div>
          <button onClick={() => shiftMonth(1)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="ماه بعد">
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 dark:divide-white/5">
          <div className="px-4 py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><TrendingUp size={13} /> درآمد</p>
            <p className="tabular mt-1 text-base font-black text-slate-800 sm:text-lg dark:text-white">{withUnit(inc)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] font-bold text-rose-500"><TrendingDown size={13} /> هزینه</p>
            <p className="tabular mt-1 text-base font-black text-slate-800 sm:text-lg dark:text-white">{withUnit(exp)}</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="flex items-center justify-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400"><Wallet size={13} /> مانده</p>
            <p className={cx('tabular mt-1 text-base font-black sm:text-lg', inc - exp < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white')}>{withUnit(inc - exp)}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* نمودار روزانه */}
          <Card>
            <CardHead title="هزینه روزانه ماه" sub="روی هر میله نگه دارید تا مبلغ را ببینید" />
            <div className="px-5 pb-5">
              <Bars data={monthDays.map((d) => ({ ...d, color: '#f43f5e' }))} formatTick={(v) => (v > 0 ? shortMoney(v) : '')} />
            </div>
          </Card>

          {/* فیلتر + لیست */}
          <Card>
            <div className="space-y-3 px-5 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  value={tab}
                  onChange={setTab}
                  options={[
                    { v: 'all', label: 'همه' },
                    { v: 'expense', label: 'هزینه‌ها' },
                    { v: 'income', label: 'درآمدها' },
                  ]}
                />
                <div className="flex-1" />
                <button onClick={exportCsv} className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                  <Download size={14} /> خروجی CSV
                </button>
                <Btn size="sm" onClick={() => { setEdit(null); setShowTx(true); }}>
                  <Plus size={15} /> تراکنش جدید
                </Btn>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در عنوان، دسته، یادداشت…" className={cx(inputCls, 'pr-9')} />
                </div>
                <select value={catF} onChange={(e) => setCatF(e.target.value)} className={cx(inputCls, 'w-auto')}>
                  {cats.map((c) => <option key={c} value={c}>{c === 'همه' ? 'همه دسته‌ها' : c}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 pt-3">
              {grouped.length === 0 ? (
                <Empty icon={<Receipt size={26} />} title="تراکنشی پیدا نشد" sub="فیلترها را تغییر بده یا تراکنش جدید ثبت کن" action={<Btn onClick={() => { setEdit(null); setShowTx(true); }}><Plus size={15} /> ثبت تراکنش</Btn>} />
              ) : (
                <div className="space-y-4">
                  {grouped.map(([day, arr]) => (
                    <div key={day}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">{smartDate(day)}</span>
                        <span className="text-[11px] text-slate-400">{formatJalali(day, { weekday: false })}</span>
                        <span className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                        <span className="tabular text-[11px] font-bold text-slate-400">
                          {withUnit(arr.reduce((a, t) => a + (t.type === 'expense' ? -t.amount : t.amount), 0))}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {arr.map((t) => (
                          <motion.li
                            key={t.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition hover:border-slate-100 hover:bg-slate-50/80 dark:hover:border-white/5 dark:hover:bg-white/[0.03]"
                          >
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg" style={{ background: `${CAT_COLORS[t.category] ?? '#64748b'}1a` }}>
                              {t.type === 'income' ? '💰' : catEmoji(t.category)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.title}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {t.category} • <span className="tabular">{formatTime(t.date)}</span>
                                {t.note ? ` • ${t.note}` : ''}
                              </p>
                            </div>
                            <span className={cx('tabular shrink-0 text-[13px] font-black', t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-100')}>
                              {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                            </span>
                            <span className="hidden shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 sm:flex">
                              <button onClick={() => { setEdit(t); setShowTx(true); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmId(t.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف">
                                <Trash2 size={14} />
                              </button>
                            </span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {/* دونات دسته‌ها */}
          <Card>
            <CardHead title="سهم دسته‌ها" sub="هزینه‌های این ماه" />
            <div className="flex flex-col items-center gap-4 px-5 pb-5">
              <Donut data={donut} size={170} thickness={24} centerTop="جمع هزینه" centerBottom={withUnit(exp)} />
              {donut.length > 0 ? <div className="w-full"><Legend items={donut} money={(v) => fmt(v)} /></div> : <p className="text-xs text-slate-400">داده‌ای نیست</p>}
            </div>
          </Card>

          {/* بودجه‌ها */}
          <Card>
            <CardHead
              title="بودجه ماهانه"
              sub="سقف هزینه هر دسته در این ماه"
              action={
                <Btn size="sm" variant="soft" onClick={() => setShowBudget(true)}>
                  <Plus size={14} /> بودجه
                </Btn>
              }
            />
            <div className="space-y-3 px-5 pb-5">
              {state.budgets.length === 0 && <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">بودجه‌ای تعریف نشده — برای کنترل هزینه‌ها بودجه بساز</p>}
              {state.budgets.map((b) => {
                const spent = monthTx.filter((t) => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + t.amount, 0);
                const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
                const over = pct > 100;
                return (
                  <div key={b.category} className="rounded-2xl border border-slate-100 p-3 dark:border-white/5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-black text-slate-700 dark:text-slate-200">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[b.category] ?? '#64748b' }} />
                        {b.category}
                      </span>
                      <button onClick={() => deleteBudget(b.category)} className="text-slate-300 transition hover:text-rose-500" title="حذف بودجه">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <Progress value={pct} color={over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#10b981'} />
                    <div className="tabular mt-1.5 flex justify-between text-[11px] font-bold text-slate-400">
                      <span>{fmt(spent)} از {fmt(b.limit)}</span>
                      <span className={over ? 'text-rose-500' : ''}>{toFa(pct)}٪</span>
                    </div>
                    {over && <p className="mt-1 text-[11px] font-bold text-rose-500">⚠️ {fmt(spent - b.limit)} بیشتر از سقف!</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* دسته‌بندی‌ها */}
          <Card>
            <CardHead title="دسته‌بندی‌ها" action={<Btn size="sm" variant="soft" onClick={() => setShowCats(true)}><Tags size={14} /> مدیریت</Btn>} />
            <div className="flex flex-wrap gap-1.5 px-5 pb-5">
              {state.expenseCats.map((c) => (
                <Badge key={c} tone="slate">{c}</Badge>
              ))}
              <span className="text-[11px] text-slate-300">|</span>
              {state.incomeCats.map((c) => (
                <Badge key={c} tone="green">{c}</Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <TxModal open={showTx} onClose={() => setShowTx(false)} edit={edit} />
      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteTransaction(confirmId)} title="حذف تراکنش؟" desc="این تراکنش برای همیشه حذف می‌شود." />
      <BudgetModal open={showBudget} onClose={() => setShowBudget(false)} />
      <CatsModal open={showCats} onClose={() => setShowCats(false)} onAdd={addCategory} onDel={deleteCategory} />
    </div>
  );
}

// ── کمک: محاسبه بازه ماه شمسی ──
function calcRange(jy: number, jm: number, tg: typeof toGregorian) {
  const startTs = sod(tg(jy, jm, 1).getTime());
  const nm = jm === 12 ? 1 : jm + 1;
  const ny = jm === 12 ? jy + 1 : jy;
  const endTs = sod(tg(ny, nm, 1).getTime()) - 1;
  return { startTs, endTs };
}

function shortMoney(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${toFa(Number.isInteger(m) ? m : +m.toFixed(1))}م`;
  }
  if (v >= 1_000) {
    const k = Math.round(v / 1_000);
    return `${toFa(k)}هـ`;
  }
  return v > 0 ? toFa(v) : '';
}

function BudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setBudget } = useApp();
  const [cat, setCat] = useState('');
  const [amtTxt, setAmtTxt] = useState('');
  const amt = parseAmount(amtTxt);
  const save = () => {
    if (!cat || amt <= 0) return;
    setBudget({ category: cat, limit: Math.round(amt) });
    setCat(''); setAmtTxt('');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="تعریف بودجه ماهانه" sub="سقف هزینه یک دسته در ماه جاری شمسی">
      <div className="space-y-4">
        <Field label="دسته هزینه">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
            <option value="">انتخاب…</option>
            {state.expenseCats.map((c) => (
              <option key={c} value={c}>{c}{state.budgets.some((b) => b.category === c) ? ' (دارد — جایگزین می‌شود)' : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="سقف ماهانه (تومان)">
          <input value={amtTxt} onChange={(e) => setAmtTxt(e.target.value)} inputMode="numeric" placeholder="مثلاً ۱۰٬۰۰۰٬۰۰۰" className={cx(inputCls, 'tabular')} />
          {amt > 0 && <span className="tabular mt-1 block text-[11px] text-emerald-600">{amt.toLocaleString('fa-IR')} تومان</span>}
        </Field>
        <div className="flex items-center gap-2 rounded-2xl bg-sky-500/5 p-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          <PiggyBank size={16} className="shrink-0 text-sky-500" />
          وقتی هزینه یک دسته از سقف بگذرد، هشدار نمایش داده می‌شود.
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
          <Btn onClick={save} disabled={!cat || amt <= 0}>ذخیره بودجه</Btn>
        </div>
      </div>
    </Modal>
  );
}

function CatsModal({
  open, onClose, onAdd, onDel,
}: {
  open: boolean; onClose: () => void;
  onAdd: (k: 'expense' | 'income', n: string) => boolean;
  onDel: (k: 'expense' | 'income', n: string) => void;
}) {
  const { state } = useApp();
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [txt, setTxt] = useState('');
  const [err, setErr] = useState('');
  const list = tab === 'expense' ? state.expenseCats : state.incomeCats;
  const used = new Set(state.transactions.filter((t) => t.type === tab).map((t) => t.category));
  return (
    <Modal open={open} onClose={onClose} title="مدیریت دسته‌بندی‌ها">
      <div className="space-y-4">
        <div className="flex justify-center">
          <Segmented value={tab} onChange={setTab} options={[{ v: 'expense', label: 'هزینه' }, { v: 'income', label: 'درآمد' }]} />
        </div>
        <div className="flex gap-2">
          <input value={txt} onChange={(e) => { setTxt(e.target.value); setErr(''); }} onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!txt.trim()) { setErr('نام دسته را بنویسید'); return; }
              if (list.includes(txt.trim())) { setErr('این دسته از قبل وجود دارد'); return; }
              onAdd(tab, txt.trim()); setTxt('');
            }
          }} placeholder="نام دسته جدید…" className={inputCls} />
          <Btn onClick={() => {
            if (!txt.trim()) { setErr('نام دسته را بنویسید'); return; }
            if (list.includes(txt.trim())) { setErr('این دسته از قبل وجود دارد'); return; }
            onAdd(tab, txt.trim()); setTxt('');
          }}>افزودن</Btn>
        </div>
        {err && <p className="text-xs font-bold text-rose-500">{err}</p>}
        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
          {list.map((c) => (
            <li key={c} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-[13px] font-bold dark:border-white/5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[c] ?? '#64748b' }} />
              <span className="flex-1 text-slate-700 dark:text-slate-200">{c}</span>
              {used.has(c) && <Badge tone="slate">{toFa(state.transactions.filter((t) => t.category === c).length)} تراکنش</Badge>}
              <button
                onClick={() => onDel(tab, c)}
                disabled={used.has(c)}
                title={used.has(c) ? 'این دسته تراکنش دارد و قابل حذف نیست' : 'حذف دسته'}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-5 text-slate-400">دسته‌ای که تراکنش دارد قابل حذف نیست تا گزارش‌ها خراب نشوند. برای تغییر نام، دسته جدید بسازید.</p>
      </div>
    </Modal>
  );
}
