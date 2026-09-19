import { useRef, useState } from 'react';
import {
  User, Palette, Database, Download, Upload, RefreshCw,
  Trash2, ShieldCheck, Moon, Sun, Monitor, Check, Tags, Repeat, Plus, Pencil, BellRing,
  CalendarDays, History, HardDrive, ClipboardPaste, Archive, ArchiveRestore, FileUp,
} from 'lucide-react';
import { useApp, validateBackup } from '../lib/store';
import type { AppState, ThemeMode } from '../lib/types';
import { TASK_CAT_COLORS, type Habit } from '../lib/types';
import { Card, CardHead, Btn, Field, inputCls, Confirm, Segmented, Modal, Progress, Badge, TimeField } from '../components/ui';
import { ColorDots, HabitModal } from '../components/forms';
import { downloadJson, readJsonFile, cx } from '../lib/utils';
import { toFa, formatJalali, formatTime, clockToFa } from '../lib/jalali';
import { formatBytes, backupFilename } from '../lib/backup';

export default function Settings() {
  const {
    state, setTheme, setName, setWeekStart, setCalSystem,
    setHabitArchived,
    importState, resetDemo, clearAll,
    addTaskCat, updateTaskCat, deleteTaskCat,
    deleteHabit, storageBytes, autoBackups, restoreAutoBackup,
  } = useApp();
  const [name, setNameLocal] = useState(state.profile.name);
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClear2, setConfirmClear2] = useState(false);
  const [clearTxt, setClearTxt] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newCatColor, setNewCatColor] = useState(TASK_CAT_COLORS[0]);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [showHabitM, setShowHabitM] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [confirmHabit, setConfirmHabit] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<AppState | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTxt, setPasteTxt] = useState('');
  const [pasteErr, setPasteErr] = useState('');
  const [pendingAuto, setPendingAuto] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (ok: boolean, txt: string) => {
    setMsg({ ok, txt });
    setTimeout(() => setMsg(null), 4000);
  };

  const counts = [
    { l: 'وظیفه', v: state.tasks.length },
    { l: 'رویداد', v: state.events.length },
    { l: 'عادت', v: state.habits.length },
    { l: 'یادداشت', v: state.notes.length },
    { l: 'بازتاب روز', v: (state.reflections ?? []).length },
    { l: 'روز نمره‌دار', v: (state.reflections ?? []).filter((r) => r.score != null).length },
  ];

  const doExport = () => {
    downloadJson(backupFilename(), state);
    flash(true, 'فایل پشتیبان دانلود شد ✅');
  };

  /** فایل را می‌خواند و در صورت معتبر بودن، پیش‌نمایش تأیید را باز می‌کند */
  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = await readJsonFile(f);
      const clean = validateBackup(data);
      if (!clean) {
        flash(false, 'فایل معتبر نیست — بازیابی انجام نشد');
        return;
      }
      setPreview(clean);
    } catch {
      flash(false, 'خطا در خواندن فایل');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePaste = () => {
    setPasteErr('');
    if (!pasteTxt.trim()) {
      setPasteErr('اول متن JSON پشتیبان را بچسبانید');
      return;
    }
    try {
      const data = JSON.parse(pasteTxt);
      const clean = validateBackup(data);
      if (!clean) {
        setPasteErr('این متن یک فایل پشتیبان معتبر نیست');
        return;
      }
      setPasteOpen(false);
      setPasteTxt('');
      setPreview(clean);
    } catch {
      setPasteErr('متن واردشده JSON معتبر نیست');
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const ok = importState(preview);
    flash(ok, ok ? 'داده‌ها با موفقیت بازیابی شدند ✅' : 'بازیابی انجام نشد');
    if (ok) setNameLocal(preview.profile?.name ?? '');
    setPreview(null);
  };

  const themes: Array<{ v: ThemeMode; label: string; icon: React.ReactNode }> = [
    { v: 'light', label: 'روشن', icon: <Sun size={16} /> },
    { v: 'dark', label: 'تیره', icon: <Moon size={16} /> },
    { v: 'system', label: 'خودکار', icon: <Monitor size={16} /> },
  ];
  const storagePct = Math.min(100, (storageBytes / (5 * 1024 * 1024)) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {msg && (
        <div className={cx(
          'rounded-2xl px-4 py-3 text-[13px] font-bold',
          msg.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
        )}>
          {msg.txt}
        </div>
      )}

      {/* پروفایل */}
      <Card>
        <CardHead title="پروفایل" sub="نامی که در داشبورد به شما سلام می‌کند" />
        <div className="flex flex-wrap items-end gap-3 px-5 pb-5">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
            <User size={24} />
          </div>
          <div className="min-w-[200px] flex-1">
            <Field label="نام شما">
              <input
                value={name}
                onChange={(e) => setNameLocal(e.target.value)}
                placeholder="مثلاً سارا محمدی"
                className={inputCls}
              />
            </Field>
          </div>
          <Btn onClick={() => { setName(name.trim()); flash(true, 'نام ذخیره شد'); }}>
            <Check size={15} /> ذخیره
          </Btn>
        </div>
      </Card>

      {/* ظاهر */}
      <Card>
        <CardHead title="ظاهر" sub="تم روشن، تیره یا هماهنگ با سیستم" />
        <div className="grid grid-cols-3 gap-2 px-5 pb-5">
          {themes.map((t) => (
            <button
              key={t.v}
              onClick={() => setTheme(t.v)}
              className={cx(
                'flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-[13px] font-black transition',
                state.settings.theme === t.v
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-100 text-slate-500 hover:border-slate-200 dark:border-white/5 dark:text-slate-300',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* تقویم */}
      <Card>
        <CardHead title="تقویم" sub="شروع هفته و ترتیب نمایش تاریخ" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
              <CalendarDays size={15} className="text-emerald-500" /> روز آغاز هفته
            </p>
            <Segmented
              value={state.settings.weekStart}
              onChange={setWeekStart}
              options={[{ v: 'sat', label: 'شنبه' }, { v: 'mon', label: 'دوشنبه' }]}
            />
            <p className="mt-2 text-[11px] leading-5 text-slate-400">در گرید ماهانه تقویم اعمال می‌شود</p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
              <CalendarDays size={15} className="text-sky-500" /> تاریخ اصلی سربرگ
            </p>
            <Segmented
              value={state.settings.calSystem}
              onChange={setCalSystem}
              options={[{ v: 'jalali', label: 'شمسی' }, { v: 'gregorian', label: 'میلادی' }]}
            />
            <p className="mt-2 text-[11px] leading-5 text-slate-400">تاریخ درشت سربرگ و بالای صفحات کدام تقویم باشد</p>
          </div>
        </div>
      </Card>

      {/* داده‌ها */}
      <Card>
        <CardHead title="مدیریت داده‌ها" sub="همه اطلاعات فقط در مرورگر شما ذخیره می‌شود" />
        <div className="px-5 pb-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {counts.map((c) => (
              <span key={c.l} className="tabular rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
                {c.l}: {toFa(c.v)}
              </span>
            ))}
          </div>

          {/* حجم حافظه */}
          <div className="mb-3 rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <HardDrive size={15} className="text-sky-500" /> حافظه مصرف‌شده مرورگر
              </span>
              <span className="tabular text-slate-400">{formatBytes(storageBytes)} از حدود ۵ مگابایت</span>
            </div>
            <Progress value={storagePct} h={8} color={storagePct > 85 ? '#f43f5e' : storagePct > 60 ? '#f59e0b' : '#10b981'} />
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-500/[0.06] px-3.5 py-2.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            ذخیره خودکار فعال است — هر تغییر بلافاصله در مرورگر ذخیره می‌شود
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Btn variant="outline" onClick={doExport}><Download size={15} /> دانلود پشتیبان</Btn>
            <Btn variant="outline" onClick={() => fileRef.current?.click()}><Upload size={15} /> بازیابی از فایل</Btn>
            <Btn variant="outline" onClick={() => { setPasteOpen(true); setPasteErr(''); }}><ClipboardPaste size={15} /> درج JSON متنی</Btn>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* درگ و دراپ */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            className={cx(
              'mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 text-xs font-bold transition',
              dragOver
                ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300'
                : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5',
            )}
          >
            <FileUp size={17} />
            فایل پشتیبان (.json) را اینجا رها کنید — یا کلیک کنید
          </div>

          {/* پشتیبان‌های خودکار */}
          <div className="mt-4 rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
              <History size={15} className="text-violet-500" /> پشتیبان‌های خودکار
              <Badge tone="violet">{toFa(autoBackups.length)} نسخه</Badge>
            </p>
            <p className="mb-3 text-[11px] leading-5 text-slate-400">
              برنامه هر چند ساعت یک اسنپ‌شات امن در همین مرورگر نگه می‌دارد (حداکثر ۳ نسخه). اگر چیزی را اشتباه پاک کردید، از اینجا برگردانید.
            </p>
            {autoBackups.length === 0 ? (
              <p className="rounded-xl bg-slate-50 py-3 text-center text-[11px] text-slate-400 dark:bg-white/5">
                هنوز اسنپ‌شاتی گرفته نشده — با ادامه کار با برنامه، خودکار ساخته می‌شود
              </p>
            ) : (
              <ul className="space-y-1.5">
                {autoBackups.map((b) => (
                  <li key={b.ts} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                    <span className="tabular text-[11px] font-black text-slate-600 dark:text-slate-200">
                      {formatJalali(b.ts, { weekday: true })} • {formatTime(b.ts)}
                    </span>
                    <span className="tabular text-[10px] text-slate-400">
                      {toFa(b.tasks)} وظیفه • {toFa(b.events)} رویداد • {toFa(b.habits)} عادت • {toFa(b.notes)} یادداشت • {toFa(b.reflections)} بازتاب
                    </span>
                    <span className="flex-1" />
                    <Btn size="xs" variant="soft" onClick={() => setPendingAuto(b.ts)}>
                      <History size={12} /> بازیابی این نسخه
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Btn variant="soft" onClick={() => setConfirmReset(true)}><RefreshCw size={15} /> بازگشت به داده نمایشی</Btn>
            <Btn variant="ghost" onClick={() => setConfirmClear(true)} className="text-rose-500 hover:bg-rose-500/10"><Trash2 size={15} /> پاک کردن همه داده‌ها</Btn>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-500/[0.06] p-3.5 text-[11px] leading-6 text-slate-500 ring-1 ring-emerald-500/15 dark:text-slate-400">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>
              حریم خصوصی شما محترم است: هیچ داده‌ای به سرور ارسال نمی‌شود و همه‌چیز در <b>localStorage مرورگر خودتان</b> ذخیره می‌ماند.
              برای انتقال به دستگاه دیگر، از دکمه «دانلود پشتیبان» استفاده کنید و فایل را در دستگاه جدید «بازیابی» کنید.
            </span>
          </div>
        </div>
      </Card>

      {/* دسته‌بندی وظایف */}
      <Card>
        <CardHead title="دسته‌بندی وظایف" sub="دسته‌های قابل انتخاب هنگام ساخت تسک (با رنگ اختصاصی)" />
        <div className="space-y-3 px-5 pb-5">
          <div className="flex gap-2">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => {
              if (e.key === 'Enter' && newCat.trim()) { e.preventDefault(); addTaskCat(newCat.trim(), newCatColor); setNewCat(''); }
            }} placeholder="نام دسته جدید…" className={inputCls} />
            <Btn onClick={() => { if (newCat.trim()) { addTaskCat(newCat.trim(), newCatColor); setNewCat(''); } }}><Plus size={15} /></Btn>
          </div>
          <ColorDots colors={TASK_CAT_COLORS} value={newCatColor} onChange={setNewCatColor} />
          <ul className="space-y-1.5">
            {(state.taskCats ?? []).map((c) => {
              const used = state.tasks.filter((t) => t.tags.includes(c.name)).length;
              const editing = editingCat === c.id;
              return (
                <li key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-white/5">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                  {editing ? (
                    <>
                      <input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} className={cx(inputCls, 'h-8 text-xs')} />
                      <Btn size="xs" onClick={() => { if (editingCatName.trim()) updateTaskCat(c.id, { name: editingCatName.trim() }); setEditingCat(null); }}>ذخیره</Btn>
                      <Btn size="xs" variant="ghost" onClick={() => setEditingCat(null)}>انصراف</Btn>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-[13px] font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                      {used > 0 && <span className="tabular rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:bg-white/10">{toFa(used)} تسک</span>}
                      <button onClick={() => { setEditingCat(c.id); setEditingCatName(c.name); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش نام"><Pencil size={13} /></button>
                      <button onClick={() => updateTaskCat(c.id, { color: TASK_CAT_COLORS[(TASK_CAT_COLORS.indexOf(c.color) + 1) % TASK_CAT_COLORS.length] })} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" title="رنگ بعدی">
                        <Palette size={13} />
                      </button>
                      <button onClick={() => { if (window.confirm(`دسته «${c.name}» حذف شود؟${used > 0 ? ` (${toFa(used)} تسک از این دسته خارج می‌شوند)` : ''}`)) deleteTaskCat(c.id); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف"><Trash2 size={13} /></button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
            <Tags size={13} className="mt-0.5 shrink-0" />
            تغییر نام دسته، برچسب تسک‌های دارای آن دسته را هم به‌روز می‌کند. حذف دسته، آن را از تسک‌ها جدا می‌کند ولی تسک‌ها پاک نمی‌شوند.
          </p>
        </div>
      </Card>

      {/* مدیریت عادت‌ها */}
      <Card>
        <CardHead
          title="مدیریت عادت‌ها"
          sub="ساخت، ویرایش، بایگانی و حذف عادت‌ها"
          action={<Btn size="sm" variant="soft" onClick={() => { setEditHabit(null); setShowHabitM(true); }}><Plus size={14} /> عادت جدید</Btn>}
        />
        <div className="px-5 pb-5">
          {state.habits.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">عادتی ثبت نشده است</p>
          ) : (
            <ul className="space-y-1.5">
              {state.habits.map((h) => (
                <li key={h.id} className={cx('flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-white/5', h.archived && 'opacity-60')}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: h.color }}><Repeat size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      {h.title}
                      {h.archived && <Badge tone="slate">بایگانی</Badge>}
                    </span>
                    <span className="tabular block text-[11px] text-slate-400">هدف: {toFa(h.targetPerWeek)} روز در هفته</span>
                  </span>
                  <button
                    onClick={() => setHabitArchived(h.id, !h.archived)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-500/10 hover:text-amber-600"
                    title={h.archived ? 'خارج کردن از بایگانی' : 'بایگانی (مخفی از ردیاب روزانه)'}
                  >
                    {h.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                  <button onClick={() => { setEditHabit(h); setShowHabitM(true); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmHabit(h.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <HabitModal open={showHabitM} onClose={() => setShowHabitM(false)} edit={editHabit} />
          <Confirm open={confirmHabit != null} onClose={() => setConfirmHabit(null)} onYes={() => confirmHabit && deleteHabit(confirmHabit)} title="حذف عادت؟" desc="عادت و تمام سوابق ثبت‌شده آن حذف می‌شود." />
        </div>
      </Card>

      {/* یادآوری */}
      <ReminderCard />

      {/* درباره */}
      <Card>
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white">
            <Database size={22} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">میزکار زندگی — نسخه ۳٫۰</h3>
            <p className="mt-0.5 text-[11px] leading-5 text-slate-400">
              مدیریت یکپارچه وظایف، تقویم شمسی، عادت‌ها، یادداشت‌ها، نمره‌ها و خلاصه‌های روزانه • تمام ساعت‌ها ۲۴ساعته •
              کاملاً آفلاین • ساخته‌شده با ❤️ برای زندگی منظم‌تر
            </p>
          </div>
        </div>
      </Card>

      <Confirm open={confirmReset} onClose={() => setConfirmReset(false)} onYes={() => { resetDemo(); setNameLocal('دوست عزیز'); flash(true, 'داده نمایشی بازیابی شد'); }} title="بازگشت به داده نمایشی؟" desc="همه داده‌های فعلی پاک و داده‌های نمونه جایگزین می‌شوند." />
      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onYes={() => { setConfirmClear2(true); setClearTxt(''); }}
        title="پاک کردن همه داده‌ها؟ (مرحله ۱ از ۲)"
        desc="وظایف، رویدادها، عادت‌ها، یادداشت‌ها و بازتاب‌های روزانه حذف می‌شوند. (پشتیبان‌های خودکار باقی می‌مانند)"
      />
      {/* تأیید دو مرحله‌ای پاک‌سازی */}
      {confirmClear2 && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmClear2(false); }}>
          <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-white p-6 shadow-2xl dark:border-rose-500/20 dark:bg-slate-900">
            <h3 className="text-[15px] font-extrabold text-rose-600 dark:text-rose-400">تأیید نهایی (مرحله ۲ از ۲) ⚠️</h3>
            <p className="mt-1.5 text-xs leading-6 text-slate-500 dark:text-slate-400">
              این عمل <b>قابل بازگشت نیست</b>. برای ادامه، عبارت <b className="tabular" dir="ltr">DELETE</b> را دقیقاً بنویسید:
            </p>
            <input value={clearTxt} onChange={(e) => setClearTxt(e.target.value)} dir="ltr" placeholder="DELETE" className={cx(inputCls, 'tabular mt-3 text-center font-black tracking-widest')} />
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setConfirmClear2(false)}>انصراف</Btn>
              <Btn
                variant="danger"
                disabled={clearTxt.trim() !== 'DELETE'}
                onClick={() => { clearAll(); setConfirmClear2(false); flash(true, 'همه داده‌ها پاک شدند'); }}
              >
                <Trash2 size={15} /> پاک‌سازی قطعی
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* پیش‌نمایش ایمپورت */}
      <Modal open={preview != null} onClose={() => setPreview(null)} title="تأیید بازیابی" sub="محتوای فایل پشتیبان — با تأیید، جایگزین داده‌های فعلی می‌شود">
        {preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { l: 'وظیفه', v: preview.tasks.length },
                { l: 'رویداد', v: preview.events.length },
                { l: 'عادت', v: preview.habits.length },
                { l: 'یادداشت', v: preview.notes.length },
                { l: 'بازتاب روز', v: (preview.reflections ?? []).length },
                { l: 'روز نمره‌دار', v: (preview.reflections ?? []).filter((r) => r.score != null).length },
              ].map((c) => (
                <span key={c.l} className="tabular rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                  {c.l}: {toFa(c.v)}
                </span>
              ))}
            </div>
            <p className="rounded-2xl bg-amber-500/5 px-3.5 py-2.5 text-[11px] leading-5 text-amber-700 ring-1 ring-amber-500/15 dark:text-amber-300">
              ⚠️ داده‌های فعلی شما جایگزین می‌شود. اگر مطمئن نیستید، اول از داده‌های فعلی «دانلود پشتیبان» بگیرید.
            </p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setPreview(null)}>انصراف</Btn>
              <Btn onClick={confirmImport}><Check size={15} /> تأیید و بازیابی</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* درج JSON متنی */}
      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="بازیابی از متن JSON" sub="متن فایل پشتیبان را اینجا بچسبانید (مثلاً از تلگرام یا ایمیل)">
        <div className="space-y-3">
          <textarea
            value={pasteTxt}
            onChange={(e) => { setPasteTxt(e.target.value); setPasteErr(''); }}
            rows={8}
            dir="ltr"
            placeholder='{"version": 1, ...}'
            className={cx(inputCls, 'h-auto py-3 font-mono text-[11px] leading-5')}
          />
          {pasteErr && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">{pasteErr}</p>}
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setPasteOpen(false)}>انصراف</Btn>
            <Btn onClick={handlePaste}><ClipboardPaste size={15} /> بررسی و ادامه</Btn>
          </div>
        </div>
      </Modal>

      {/* بازیابی اسنپ‌شات خودکار */}
      <Confirm
        open={pendingAuto != null}
        onClose={() => setPendingAuto(null)}
        onYes={() => {
          if (pendingAuto == null) return;
          const ok = restoreAutoBackup(pendingAuto);
          flash(ok, ok ? 'نسخه خودکار بازیابی شد ✅' : 'بازیابی انجام نشد');
          if (ok) setNameLocal(state.profile.name);
        }}
        title="بازیابی نسخه خودکار؟"
        desc={pendingAuto != null ? `بازگشت به نسخه ${formatJalali(pendingAuto, { weekday: true })} ساعت ${formatTime(pendingAuto)}. داده‌های فعلی جایگزین می‌شوند.` : undefined}
      />
    </div>
  );
}

function ReminderCard() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('hamrah_reminder') === '1'; } catch { return false; }
  });
  const [time, setTime] = useState(() => {
    try { return localStorage.getItem('hamrah_reminder_time') || '22:00'; } catch { return '22:00'; }
  });
  const [perm, setPerm] = useState<string>(() => {
    try { return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'; } catch { return 'unsupported'; }
  });

  const toggle = async () => {
    if (!enabled) {
      try {
        if (typeof Notification === 'undefined') { setPerm('unsupported'); return; }
        const p = await Notification.requestPermission();
        setPerm(p);
        if (p !== 'granted') return;
      } catch { return; }
      try {
        localStorage.setItem('hamrah_reminder', '1');
        localStorage.setItem('hamrah_reminder_time', time);
      } catch { /* ignore */ }
      setEnabled(true);
      scheduleCheck(time);
    } else {
      try { localStorage.setItem('hamrah_reminder', '0'); } catch { /* ignore */ }
      setEnabled(false);
    }
  };

  const changeTime = (v: string) => {
    setTime(v);
    try { localStorage.setItem('hamrah_reminder_time', v); } catch { /* ignore */ }
    if (enabled) scheduleCheck(v);
  };

  return (
    <Card>
      <CardHead title="یادآوری بازتاب شبانه" sub="هر شب سر ساعت مشخص، مرورگر به شما یادآوری می‌کند" />
      <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-500"><BellRing size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black text-slate-700 dark:text-slate-200">
            {perm === 'unsupported' ? 'مرورگر شما اعلان پشتیبانی نمی‌کند' : enabled ? `یادآوری فعال — هر شب ساعت ${clockToFa(time)} (۲۴ساعته)` : 'یادآوری غیرفعال است'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">تب برنامه باید باز باشد تا اعلان نمایش داده شود</p>
        </div>
        <TimeField value={time} onChange={changeTime} className="w-28" ariaLabel="ساعت یادآوری" placeholder="۲۲:۰۰" allowEmpty={false} />
        <Segmented value={enabled ? 'on' : 'off'} onChange={(v) => { if ((v === 'on') !== enabled) toggle(); }} options={[{ v: 'off', label: 'خاموش' }, { v: 'on', label: 'روشن' }]} />
      </div>
    </Card>
  );
}

let reminderTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCheck(time: string) {
  try {
    if (reminderTimer) clearTimeout(reminderTimer);
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const now = new Date();
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    const wait = Math.min(next.getTime() - now.getTime(), 2_147_483_647);
    reminderTimer = setTimeout(() => {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('میزکار زندگی 🌙', { body: 'وقت بازتاب امروز است — دو دقیقه بنویس!', tag: 'hamrah-nightly' });
        }
      } catch { /* ignore */ }
      try {
        if (localStorage.getItem('hamrah_reminder') === '1') {
          scheduleCheck(localStorage.getItem('hamrah_reminder_time') || '22:00');
        }
      } catch { /* ignore */ }
    }, wait);
  } catch { /* ignore */ }
}

// فعال‌سازی خودکار یادآوری در صورت فعال بودن قبلی
try {
  if (typeof window !== 'undefined' && localStorage.getItem('hamrah_reminder') === '1') {
    scheduleCheck(localStorage.getItem('hamrah_reminder_time') || '22:00');
  }
} catch { /* ignore */ }
