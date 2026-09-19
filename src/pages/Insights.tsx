import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, CalendarRange, CheckCheck, ChevronLeft, ChevronRight, ClipboardCopy,
  Copy, Download, Dices, Eraser, FileText, Info, LineChart as LineIcon, ListChecks,
  MousePointerClick, Sparkles, Star, Target, Wand2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/store';
import {
  addDays, addMonthsJalali, clockToFa, formatJalali, formatJalaliShort, formatScore,
  getMonthGrid, J_MONTHS, J_WEEKDAYS, J_WEEKDAYS_SHORT, jalaliMonthRange, rangeLabel,
  startOfDay, startOfWeek, toFa, toGregorian, toJalaali, todayStart, weekdayName,
} from '../lib/jalali';
import {
  avg, buildDayStats, downloadText, exportRowsCsv, extremes, lastNDaysRange, median,
  previousRange, rangeDays, reflectionMap, scoreHistogram, sleepDurationMin,
  thisMonthRange, thisWeekRange, weekdayAverages, type DayStats, type Range as DRange,
} from '../lib/stats';
import {
  buildMultiDaySummary, DEFAULT_SUMMARY_OPTIONS, missingFields, NOT_RECORDED,
  type MultiSummaryOptions,
} from '../lib/summary';
import { moodFace, moodLabel, SCORE_MAX } from '../lib/types';
import {
  Badge, Btn, Card, CardHead, CheckPill, Empty, Progress, ScorePill, Segmented,
} from '../components/ui';
import { cx, copyToClipboard, sampleRandom } from '../lib/utils';

// ── انواع بازه ───────────────────────────────────────────────
type RangePreset = 'thisWeek' | 'lastWeek' | 'd7' | 'd30' | 'thisMonth' | 'lastMonth' | 'd90' | 'd365' | 'custom';

const PRESETS: Array<{ v: RangePreset; label: string }> = [
  { v: 'thisWeek', label: 'این هفته' },
  { v: 'lastWeek', label: 'هفته گذشته' },
  { v: 'd7', label: '۷ روز اخیر' },
  { v: 'd30', label: '۳۰ روز اخیر' },
  { v: 'thisMonth', label: 'این ماه' },
  { v: 'lastMonth', label: 'ماه گذشته' },
  { v: 'd90', label: '۹۰ روز اخیر' },
  { v: 'd365', label: 'یک سال اخیر' },
  { v: 'custom', label: 'بازه دلخواه' },
];

type SortKey = 'asc' | 'desc' | 'scoreDesc' | 'scoreAsc' | 'selected';

interface FieldFlags {
  score: boolean;
  mood: boolean;
  basics: boolean;
  progress: boolean;
  dayNote: boolean;
  wins: boolean;
  improve: boolean;
  lessons: boolean;
  gratitude: boolean;
}

const FIELD_LABELS: Array<{ k: keyof FieldFlags; label: string }> = [
  { k: 'score', label: '⭐ نمره روز' },
  { k: 'mood', label: '😊 حال روز' },
  { k: 'progress', label: '✅ تسک‌ها و عادت‌ها' },
  { k: 'basics', label: '😴 خواب و ورزش و بیرون' },
  { k: 'dayNote', label: '📝 یادداشت روز' },
  { k: 'wins', label: '🏆 دستاوردها' },
  { k: 'improve', label: '🔧 قابل بهبود' },
  { k: 'lessons', label: '💡 درس آموخته‌شده' },
  { k: 'gratitude', label: '🙏 قدردانی' },
];

export default function Insights() {
  const { state } = useApp();
  const [params, setParams] = useSearchParams();
  const weekStart = state.settings.weekStart;
  const today = todayStart();

  // ── بازه زمانی ────────────────────────────────────────────
  const [preset, setPreset] = useState<RangePreset>('d30');
  const [custom, setCustom] = useState<DRange>(() => lastNDaysRange(30));
  const range = useMemo<DRange>(() => {
    switch (preset) {
      case 'thisWeek': return thisWeekRange(today, weekStart);
      case 'lastWeek': {
        const w = thisWeekRange(today, weekStart);
        return { start: addDays(w.start, -7), end: addDays(w.end, -7) };
      }
      case 'd7': return lastNDaysRange(7, today);
      case 'thisMonth': return thisMonthRange(today);
      case 'lastMonth': {
        const j = toJalaali(new Date(today));
        const p = addMonthsJalali(j.jy, j.jm, -1);
        return monthRangeOf(p.jy, p.jm);
      }
      case 'd90': return lastNDaysRange(90, today);
      case 'd365': return lastNDaysRange(365, today);
      case 'custom': return custom;
      case 'd30':
      default: return lastNDaysRange(30, today);
    }
  }, [preset, today, weekStart, custom]);

  const days = useMemo(() => rangeDays(range), [range]);
  const stats = useMemo(() => buildDayStats(days, state), [days, state]);
  const refMap = useMemo(() => reflectionMap(state.reflections), [state.reflections]);

  // مقایسه با بازه هم‌طول قبلی
  const prevRange = useMemo(() => previousRange(range), [range]);
  const prevStats = useMemo(() => buildDayStats(rangeDays(prevRange), state), [prevRange, state]);

  const scored = useMemo(
    () => stats.filter((d): d is DayStats & { score: number } => d.score != null),
    [stats],
  );
  const scores = useMemo(() => scored.map((d) => d.score), [scored]);
  const avgScore = avg(scores);
  const medScore = median(scores);
  const prevScores = prevStats.map((d) => d.score).filter((s): s is number => s != null);
  const prevAvg = avg(prevScores);
  const delta = avgScore != null && prevAvg != null ? Math.round((avgScore - prevAvg) * 10) / 10 : null;
  const scoredDaysPct = days.length ? Math.round((scored.length / days.length) * 100) : 0;
  const { best, worst } = extremes(stats.map((d) => ({ day: d.day, value: d.score })));
  const moodAvg = avg(stats.map((d) => d.mood).filter((m): m is number => m != null));
  const habitRate = useMemo(() => {
    const total = stats.reduce((a, d) => a + d.habitsTotal, 0);
    const done = stats.reduce((a, d) => a + d.habitsDone, 0);
    return total ? Math.round((done / total) * 100) : 0;
  }, [stats]);
  const taskRate = useMemo(() => {
    const withTasks = stats.filter((d) => d.total > 0);
    if (!withTasks.length) return null;
    return Math.round(avg(withTasks.map((d) => d.pct)) ?? 0);
  }, [stats]);
  // هیستوگرام نمره‌ها (محاسبه سبک؛ نیازی به memo ندارد)
  const hist = scoreHistogram(scores, 1);
  const weekdayAvg = useMemo(
    () => weekdayAverages(stats, (ts) => (new Date(ts).getDay() + 1) % 7),
    [stats],
  );

  // ── انتخاب روزها ──────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [randomN, setRandomN] = useState(10);
  const [randomOnlyScored, setRandomOnlyScored] = useState(true);

  // اگر بازه عوض شد، انتخاب‌های خارج بازه پاک شوند
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((d) => d >= range.start && d <= range.end));
      return next.size === prev.size ? prev : next;
    });
  }, [range.start, range.end]);

  // میان‌بر از جست‌وجوی سراسری: ?day=…
  const dayParam = params.get('day');
  useEffect(() => {
    const n = dayParam != null ? Number(dayParam) : NaN;
    if (!Number.isFinite(n) || n <= 0) return;
    const ts = startOfDay(n);
    setPreset('custom');
    setCustom({ start: addDays(ts, -14), end: addDays(ts, 14) });
    setSelected(new Set([ts]));
    setParams({}, { replace: true });
  }, [dayParam, setParams]);

  const toggleDay = (day: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const selectScoredInRange = () => setSelected(new Set(scored.map((d) => d.day)));
  const selectAllInRange = () => setSelected(new Set(days));
  const clearSelection = () => setSelected(new Set());
  const pickRandom = () => {
    const pool = (randomOnlyScored ? scored.map((d) => d.day) : days);
    setSelected(new Set(sampleRandom(pool, randomN)));
  };

  const selectedDays = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const selectedStats = useMemo(
    () => selectedDays.map((d) => stats.find((s) => s.day === d)).filter((x): x is DayStats => !!x),
    [selectedDays, stats],
  );
  const selectedScores = selectedStats.map((d) => d.score).filter((s): s is number => s != null);
  const selectedAvg = avg(selectedScores);

  // ── خروجی متنی ────────────────────────────────────────────
  const [fields, setFields] = useState<FieldFlags>({
    score: true, mood: true, basics: true, progress: true, dayNote: true, wins: true, improve: true, lessons: true, gratitude: true,
  });
  const [source, setSource] = useState<'selected' | 'rangeScored' | 'rangeAll' | 'weeks' | 'months'>('selected');
  const [style, setStyle] = useState<'plain' | 'markdown' | 'csv'>('plain');
  const [sort, setSort] = useState<SortKey>('asc');
  const [copied, setCopied] = useState(false);
  const [includeGroupHeader, setIncludeGroupHeader] = useState(true);

  const summaryOptions: MultiSummaryOptions = useMemo(() => ({
    ...DEFAULT_SUMMARY_OPTIONS,
    includeScore: fields.score,
    mood: fields.mood,
    basics: fields.basics,
    progress: fields.progress,
    dayNote: fields.dayNote,
    wins: fields.wins,
    improve: fields.improve,
    lessons: fields.lessons,
    gratitude: fields.gratitude,
    style: style === 'markdown' ? 'markdown' : 'plain',
    header: true,
    groupHeader: includeGroupHeader,
    sort: sort === 'selected' ? 'asc' : sort,
  }), [fields, style, sort, includeGroupHeader]);

  const outputText = useMemo(() => {
    if (style === 'csv') return buildCsvText(source, days, stats, fields, state.settings.weekStart);
    if (source === 'weeks') return buildWeeksSummary(days, state, summaryOptions);
    if (source === 'months') return buildMonthsSummary(days, state, summaryOptions);
    // روزهای خروجی بر اساس منبع انتخاب‌شده
    const outputDays = computeOutputDays(source, selectedDays, scored, days);
    if (outputDays.length === 0) return '';
    return buildMultiDaySummary(outputDays, {
      reflections: state.reflections,
      tasks: state.tasks,
      habits: state.habits,
      habitLogs: state.habitLogs,
    }, {
      ...summaryOptions,
      title: source === 'selected' ? `خلاصه ${toFa(outputDays.length)} روز انتخاب‌شده` : `خلاصه روزهای بازه (${toFa(outputDays.length)} روز)`,
    });
  }, [source, days, stats, fields, summaryOptions, style, state, selectedDays, scored]);

  const copyOutput = async () => {
    if (!outputText) return;
    const ok = await copyToClipboard(outputText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const downloadOutput = () => {
    if (!outputText) return;
    const stamp = formatJalaliShort(today).replace(/\//g, '-');
    if (style === 'csv') {
      downloadText(`day-summary-${stamp}.csv`, outputText, 'text/csv;charset=utf-8');
    } else {
      const ext = style === 'markdown' ? 'md' : 'txt';
      downloadText(`day-summary-${stamp}.${ext}`, outputText, 'text/plain;charset=utf-8');
    }
  };

  const outputLabel = source === 'weeks' ? 'خلاصه هفته‌ها' : source === 'months' ? 'خلاصه ماه‌ها' : source === 'selected' ? 'روزهای انتخاب‌شده' : source === 'rangeScored' ? 'همه روزهای نمره‌دار بازه' : 'همه روزهای بازه';

  return (
    <div className="space-y-5">
      {/* ── نوار بازه زمانی ───────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-black text-slate-500 dark:text-slate-300">
            <CalendarRange size={16} className="text-emerald-500" /> بازه زمانی
          </span>
          <Segmented
            size="sm"
            value={preset}
            onChange={setPreset}
            options={PRESETS.filter((p) => p.v !== 'custom').map((p) => ({ v: p.v, label: p.label }))}
          />
          <Btn size="sm" variant={preset === 'custom' ? 'primary' : 'outline'} onClick={() => setPreset('custom')}>
            بازه دلخواه
          </Btn>
          <span className="flex-1" />
          <span className="rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
            {formatJalali(range.start)} تا {formatJalali(range.end)} • {toFa(days.length)} روز
          </span>
        </div>
        {preset === 'custom' && (
          <CustomRangePicker value={custom} onChange={setCustom} max={today} />
        )}
      </Card>

      {/* ── کارت‌های آماری ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={<Star size={18} />} tone="amber"
          label="میانگین نمره"
          value={avgScore != null ? `${formatScore(avgScore)} از ۱۰` : NOT_RECORDED}
          sub={`${toFa(scored.length)} روز نمره‌دار از ${toFa(days.length)} روز`}
        />
        <StatTile
          icon={<Target size={18} />} tone="violet"
          label="میانه نمره‌ها"
          value={medScore != null ? `${formatScore(medScore)} از ۱۰` : NOT_RECORDED}
          sub={`پوشش ثبت نمره: ${toFa(scoredDaysPct)}٪ روزهای بازه`}
        />
        <StatTile
          icon={<LineIcon size={18} />} tone={delta == null ? 'slate' : delta >= 0 ? 'green' : 'rose'}
          label="روند نسبت به بازه قبل"
          value={delta == null ? 'قابل مقایسه نیست' : `${delta >= 0 ? '▲' : '▼'} ${formatScore(Math.abs(delta))}`}
          sub={prevAvg != null ? `میانگین بازه قبل: ${formatScore(prevAvg)} از ۱۰` : 'در بازه قبل نمره‌ای ثبت نشده'}
        />
        <StatTile
          icon={<Sparkles size={18} />} tone="green"
          label="ثبت‌شده‌ها"
          value={`${toFa(scored.length)} روز`}
          sub={`بهره‌وری تسک‌ها: ${taskRate != null ? `${toFa(taskRate)}٪` : NOT_RECORDED} • عادت‌ها: ${toFa(habitRate)}٪`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* ── تقویم نمره ──────────────────────────────────── */}
        <div className="xl:col-span-2">
          <ScoreCalendar
            selected={selected}
            onToggle={toggleDay}
            onSelectRange={(r) => setSelected(new Set(r))}
            refMap={refMap}
            weekStart={weekStart}
            onJumpRange={(r) => { setPreset('custom'); setCustom(r); }}
          />
        </div>
        <div className="space-y-5">
          <Card>
            <CardHead title="بهترین و ضعیف‌ترین روزها" sub="بر اساس نمره ثبت‌شده در این بازه" />
            <div className="space-y-3 px-5 pb-5">
              <ExtremeRow tone="green" title="بهترین روز" day={best?.day ?? null} score={best?.value ?? null} />
              <ExtremeRow tone="rose" title="ضعیف‌ترین روز" day={worst?.day ?? null} score={worst?.value ?? null} />
              <div className="rounded-2xl bg-slate-50 p-3.5 text-[11px] leading-6 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                میانگین حال روزانه: <b className="tabular">{moodAvg != null ? `${moodFace(Math.round(moodAvg))} ${formatScore(moodAvg)} از ۵` : NOT_RECORDED}</b>
                <br />
                روزهای ورزش: <b className="tabular">{toFa(stats.filter((d) => d.sport).length)}</b> •
                روزهای بیرون: <b className="tabular">{toFa(stats.filter((d) => d.wentOut).length)}</b>
              </div>
              <AvgSleepRow stats={stats} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── نمودار نمره روزانه ─────────────────────────── */}
        <Card>
          <CardHead
            title="نمره روزها در این بازه"
            sub="روی هر ستون نگه دارید تا جزئیات همان روز را ببینید"
          />
          <div className="px-5 pb-5">
            {stats.length === 0 ? (
              <Empty icon={<BarChart3 size={24} />} title="بازه خالی است" />
            ) : (
              <ScoreBars stats={stats} onPick={(d) => toggleDay(d)} selected={selected} />
            )}
          </div>
        </Card>

        {/* ── توزیع و الگو هفتگی ─────────────────────────── */}
        <Card>
          <CardHead title="توزیع نمره‌ها و الگوی هفتگی" sub="کدام بازه‌ها و کدام روزهای هفته بهتر بوده‌اند" />
          <div className="space-y-5 px-5 pb-5">
            <div>
              <p className="mb-2 text-[11px] font-black text-slate-500">پراکندگی نمره (۰ تا ۱۰)</p>
              <div className="flex items-end gap-1.5" dir="ltr">
                {hist.map((b) => {
                  const maxC = Math.max(...hist.map((h) => h.count), 1);
                  return (
                    <div key={b.from} className="flex flex-1 flex-col items-center gap-1" title={`${b.from} تا ${(b.from + 1).toFixed(1)}: ${b.count} روز`}>
                      <span className="tabular text-[10px] font-bold text-slate-400">{b.count > 0 ? toFa(b.count) : ''}</span>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height: Math.max(b.count ? 8 : 3, (b.count / maxC) * 90),
                          background: b.from >= 8 ? '#10b981' : b.from >= 5 ? '#f59e0b' : b.from >= 3 ? '#fb923c' : '#f43f5e',
                          opacity: b.count ? 1 : 0.25,
                        }}
                      />
                      <span className="tabular text-[9px] font-bold text-slate-400">{toFa(b.from)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-black text-slate-500">میانگین نمره به تفکیک روز هفته</p>
              <div className="flex flex-wrap gap-1.5" dir="rtl">
                {weekdayAvg.map((w) => (
                  <div
                    key={w.wd}
                    className={cx(
                      'min-w-[62px] flex-1 rounded-xl border p-2 text-center',
                      w.avgScore == null ? 'border-slate-100 dark:border-white/5' : 'border-transparent bg-emerald-500/[0.07]',
                    )}
                    title={`${J_WEEKDAYS[w.wd]} — ${w.count} روز نمره‌دار`}
                  >
                    <p className="text-[10px] font-bold text-slate-400">{J_WEEKDAYS_SHORT[w.wd]}</p>
                    <p className="tabular text-[13px] font-black text-slate-700 dark:text-slate-100">
                      {w.avgScore != null ? formatScore(w.avgScore) : NOT_RECORDED}
                    </p>
                    <p className="tabular text-[9px] text-slate-400">{toFa(w.count)} روز</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── انتخاب روزها ─────────────────────────────────── */}
      <Card>
        <CardHead
          title="انتخاب روزها"
          sub="روی خانه‌های تقویم یا ستون‌های نمودار کلیک کنید؛ یا روزهای تصادفی/دارای نمره را یک‌جا انتخاب کنید"
          action={<Badge tone={selected.size ? 'green' : 'slate'}>{toFa(selected.size)} روز انتخاب‌شده</Badge>}
        />
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <Btn size="sm" variant="soft" onClick={selectScoredInRange}>
            <ListChecks size={14} /> انتخاب روزهای نمره‌دار بازه ({toFa(scored.length)})
          </Btn>
          <Btn size="sm" variant="outline" onClick={selectAllInRange}>
            <MousePointerClick size={14} /> انتخاب همه روزهای بازه ({toFa(days.length)})
          </Btn>
          <Btn size="sm" variant="ghost" onClick={clearSelection} disabled={selected.size === 0}>
            <Eraser size={14} /> پاک کردن انتخاب
          </Btn>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-300">
            <Dices size={15} className="text-violet-500" /> تعداد تصادفی
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={randomN}
            onChange={(e) => setRandomN(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
            className="tabular h-8 w-16 rounded-xl border border-slate-200 bg-slate-50/60 px-2 text-center text-xs font-bold dark:border-white/10 dark:bg-white/5"
            aria-label="تعداد روزهای تصادفی"
          />
          <Btn size="sm" variant="soft" onClick={pickRandom} disabled={(randomOnlyScored ? scored.length : days.length) === 0}>
            <Wand2 size={14} /> انتخاب تصادفی
          </Btn>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-300">
            <input
              type="checkbox"
              checked={randomOnlyScored}
              onChange={(e) => setRandomOnlyScored(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600"
            />
            فقط روزهای نمره‌دار
          </label>
        </div>
        {selected.size > 0 && (
          <div className="px-5 pb-5">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-300">
              <span>میانگین نمره انتخاب‌شده‌ها: <b className="tabular text-amber-600 dark:text-amber-300">{selectedAvg != null ? `${formatScore(selectedAvg)} از ۱۰` : NOT_RECORDED}</b></span>
              <span>•</span>
              <span>روزهای بدون نمره: <b className="tabular">{toFa(selectedStats.length - selectedScores.length)}</b></span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedStats.map((d) => (
                <button
                  key={d.day}
                  onClick={() => toggleDay(d.day)}
                  title={`${formatJalali(d.day, { weekday: true })} — نمره: ${d.score != null ? formatScore(d.score) : NOT_RECORDED}`}
                  className="group flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-rose-500/10 hover:text-rose-600 dark:text-emerald-300"
                >
                  <span className="tabular">{formatJalaliShort(d.day)}</span>
                  {d.score != null ? <span className="tabular opacity-80">{formatScore(d.score)}</span> : <span className="opacity-60">بدون نمره</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── ساخت خروجی متنی ─────────────────────────────── */}
      <Card>
        <CardHead
          title="کپی/دریافت خلاصه روزها"
          sub="خروجی کاملاً شفاف است: هر چیزی که ثبت نشده، صریحاً «ثبت نشده» یا «خالی» نوشته می‌شود"
          action={
            <div className="flex items-center gap-2">
              <Badge tone="violet"><ClipboardCopy size={12} /> {outputLabel}</Badge>
            </div>
          }
        />

        <div className="grid gap-4 px-5 pb-5 lg:grid-cols-5">
          {/* تنظیمات خروجی */}
          <div className="space-y-3 lg:col-span-2">
            <div>
              <p className="mb-1.5 text-[11px] font-black text-slate-500">منبع خروجی</p>
              <Segmented
                size="sm"
                value={source}
                onChange={setSource}
                options={[
                  { v: 'selected', label: `انتخاب‌شده (${toFa(selected.size)})` },
                  { v: 'rangeScored', label: 'نمره‌دار بازه' },
                  { v: 'rangeAll', label: 'همه بازه' },
                  { v: 'weeks', label: 'هفته‌ها' },
                  { v: 'months', label: 'ماه‌ها' },
                ]}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black text-slate-500">بخش‌های موجود در خروجی</p>
              <div className="flex flex-wrap gap-1.5">
                {FIELD_LABELS.map((f) => (
                  <CheckPill
                    key={f.k}
                    checked={fields[f.k]}
                    onChange={(v) => setFields((prev) => ({ ...prev, [f.k]: v }))}
                  >
                    {f.label}
                  </CheckPill>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn size="xs" variant="outline" onClick={() => setFields(allTrue)}>همه بخش‌ها</Btn>
                <Btn size="xs" variant="outline" onClick={() => setFields({ ...allFalse, mood: true, progress: true, dayNote: true })}>فقط متن و حال</Btn>
                <Btn size="xs" variant="outline" onClick={() => setFields({ ...allFalse, dayNote: true, wins: true, improve: true, lessons: true, gratitude: true })}>بدون نمره</Btn>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1.5 text-[11px] font-black text-slate-500">قالب</p>
                <Segmented
                  size="sm"
                  value={style}
                  onChange={setStyle}
                  options={[{ v: 'plain', label: 'متنی' }, { v: 'markdown', label: 'مارک‌داون' }, { v: 'csv', label: 'CSV' }]}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-black text-slate-500">ترتیب روزها</p>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-2 text-xs font-bold dark:border-white/10 dark:bg-white/5"
                >
                  <option value="asc">قدیمی به جدید</option>
                  <option value="desc">جدید به قدیمی</option>
                  <option value="scoreDesc">نمره: زیاد به کم</option>
                  <option value="scoreAsc">نمره: کم به زیاد</option>
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeGroupHeader}
                onChange={(e) => setIncludeGroupHeader(e.target.checked)}
                className="h-3.5 w-3.5 accent-emerald-600"
              />
              درج سرصفحه و آمار کلی در ابتدای خروجی
            </label>

            <div className="flex gap-2">
              <Btn onClick={copyOutput} disabled={!outputText} className="flex-1">
                {copied ? <><CheckCheck size={15} /> کپی شد!</> : <><Copy size={15} /> کپی همه</>}
              </Btn>
              <Btn variant="outline" onClick={downloadOutput} disabled={!outputText}>
                <Download size={15} /> فایل
              </Btn>
            </div>
            <p className="flex items-start gap-1.5 text-[10px] leading-5 text-slate-400">
              <Info size={13} className="mt-0.5 shrink-0" />
              {style === 'csv'
                ? 'خروجی CSV برای اکسل مناسب است (با BOM تا فارسی درست نمایش داده شود).'
                : 'خروجی متنی را می‌توانید در یادداشت، تلگرام یا گزارش روزانه بچسبانید.'}
            </p>
          </div>

          {/* پیش‌نمایش */}
          <div className="lg:col-span-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-black text-slate-500">پیش‌نمایش خروجی</p>
              <span className="tabular text-[10px] font-bold text-slate-400">
                {outputText ? `${toFa(outputText.split('\n').length)} خط • ${toFa(outputText.length)} نویسه` : 'خالی'}
              </span>
            </div>
            {outputText ? (
              <pre
                dir="rtl"
                className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-[12px] leading-7 whitespace-pre-wrap text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200"
              >
                {outputText}
              </pre>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-xs text-slate-400 dark:border-white/10">
                <FileText size={24} className="mx-auto mb-2 opacity-60" />
                برای ساخت خروجی، روزهایی را انتخاب کنید یا منبع را روی «همه بازه» بگذارید
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── جدول‌های هفتگی و ماهانه ─────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <WeeklyTable stats={stats} weekStart={weekStart} onPickWeek={(r) => { setPreset('custom'); setCustom(r); }} />
        <MonthlyTable stats={stats} onPickMonth={(r) => { setPreset('custom'); setCustom(r); }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// اجزای کمکی
// ═══════════════════════════════════════════════════════════════

/** تعیین روزهای خروجی بر اساس منبع انتخاب‌شده */
function computeOutputDays(
  source: 'selected' | 'rangeScored' | 'rangeAll' | 'weeks' | 'months',
  selectedDays: number[],
  scored: Array<{ day: number }>,
  rangeDays: number[],
): number[] {
  if (source === 'selected') return selectedDays;
  if (source === 'rangeScored') return scored.map((d) => d.day);
  if (source === 'rangeAll') return rangeDays;
  return [];
}

const allTrue: FieldFlags = {
  score: true, mood: true, basics: true, progress: true, dayNote: true, wins: true, improve: true, lessons: true, gratitude: true,
};
const allFalse: FieldFlags = {
  score: false, mood: false, basics: false, progress: false, dayNote: false, wins: false, improve: false, lessons: false, gratitude: false,
};

/** بازه کامل یک ماه شمسی مشخص */
function monthRangeOf(jy: number, jm: number): DRange {
  const start = startOfDay(toGregorian(jy, jm, 1).getTime());
  const next = addMonthsJalali(jy, jm, 1);
  const end = startOfDay(toGregorian(next.jy, next.jm, 1).getTime()) - 1;
  return { start, end };
}

function StatTile({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'green' | 'rose' | 'amber' | 'violet' | 'slate';
}) {
  const tones: Record<string, string> = {
    green: 'from-emerald-500 to-teal-600 shadow-emerald-600/20',
    rose: 'from-rose-500 to-pink-600 shadow-rose-600/20',
    amber: 'from-amber-500 to-orange-600 shadow-amber-600/20',
    violet: 'from-violet-500 to-purple-600 shadow-violet-600/20',
    slate: 'from-slate-400 to-slate-600 shadow-slate-600/20',
  };
  return (
    <Card hover className="p-4">
      <div className={cx('mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg', tones[tone])}>
        {icon}
      </div>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-1 text-[16px] font-black text-slate-800 dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-400">{sub}</p>
    </Card>
  );
}

function ExtremeRow({ title, day, score, tone }: { title: string; day: number | null; score: number | null; tone: 'green' | 'rose' }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl border p-3', tone === 'green' ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-rose-500/20 bg-rose-500/[0.05]')}>
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white', tone === 'green' ? 'bg-emerald-500' : 'bg-rose-500')}>
        <Star size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400">{title}</p>
        <p className="truncate text-[13px] font-black text-slate-700 dark:text-slate-100">
          {day != null ? formatJalali(day, { weekday: true }) : NOT_RECORDED}
        </p>
      </div>
      <ScorePill score={score} />
    </div>
  );
}

function AvgSleepRow({ stats }: { stats: DayStats[] }) {
  const durs = stats.map((d) => sleepDurationMin(d.reflection?.wake, d.reflection?.sleep)).filter((x): x is number => x != null);
  const m = avg(durs);
  return (
    <div className="rounded-2xl bg-slate-50 p-3.5 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
      میانگین خواب شبانه:{' '}
      <b className="tabular text-slate-700 dark:text-slate-200">
        {m != null ? `${toFa((m / 60).toFixed(1))} ساعت` : NOT_RECORDED}
      </b>
      <span className="text-slate-400"> ({toFa(durs.length)} شب ثبت‌شده)</span>
    </div>
  );
}

function ScoreBars({ stats, selected, onPick }: { stats: DayStats[]; selected: Set<number>; onPick: (day: number) => void }) {
  const maxDay = stats.length;
  const barW = Math.max(6, Math.min(26, Math.floor(560 / Math.max(maxDay, 1)) - 3));
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-end gap-1" style={{ minWidth: maxDay * (barW + 3) }}>
        {stats.map((d) => {
          const isSel = selected.has(d.day);
          const h = d.score != null ? 12 + (d.score / SCORE_MAX) * 110 : 6;
          const color = d.score == null ? '#cbd5e1' : d.score >= 8 ? '#10b981' : d.score >= 5 ? '#f59e0b' : '#f43f5e';
          return (
            <button
              key={d.day}
              onClick={() => onPick(d.day)}
              title={`${formatJalali(d.day, { weekday: true })} — نمره: ${d.score != null ? formatScore(d.score) : NOT_RECORDED}${isSel ? ' (انتخاب‌شده)' : ''}`}
              className="group flex shrink-0 flex-col items-center gap-1"
              style={{ width: barW }}
            >
              <span className="tabular text-[9px] font-black text-slate-400 opacity-0 transition group-hover:opacity-100">
                {d.score != null ? formatScore(d.score) : '—'}
              </span>
              <span
                className={cx('w-full rounded-t-md transition-all', isSel && 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-900')}
                style={{ height: h, background: color, opacity: d.score == null ? 0.4 : 1 }}
              />
              <span className={cx('tabular text-[9px] font-bold', isSel ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
                {toFa(toJalaali(new Date(d.day)).jd)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomRangePicker({ value, onChange, max }: { value: DRange; onChange: (r: DRange) => void; max: number }) {
  const [err, setErr] = useState('');
  const setStart = (ts: number) => {
    if (ts > value.end) { setErr('روز شروع نمی‌تواند بعد از روز پایان باشد'); return; }
    setErr('');
    onChange({ ...value, start: ts });
  };
  const setEnd = (ts: number) => {
    if (ts < value.start) { setErr('روز پایان نمی‌تواند قبل از روز شروع باشد'); return; }
    setErr('');
    onChange({ ...value, end: ts });
  };
  return (
    <div className="mt-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-500">از روز</p>
          <JalaliDayPicker value={value.start} onChange={setStart} max={max} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-bold text-slate-500">تا روز</p>
          <JalaliDayPicker value={value.end} onChange={setEnd} max={max} />
        </div>
      </div>
      {err && <p className="mt-2 text-[11px] font-bold text-rose-500">{err}</p>}
    </div>
  );
}

/** انتخاب‌گر روز شمسی سبک: یک ورودی عددی روز + ماه + سال */
function JalaliDayPicker({ value, onChange, max }: { value: number; onChange: (ts: number) => void; max: number }) {
  const j = toJalaali(new Date(value));
  const years: number[] = [];
  const baseYear = toJalaali(new Date(max)).jy;
  for (let y = baseYear - 6; y <= baseYear + 2; y++) years.push(y);
  const commit = (jy: number, jm: number, jd: number) => {
    try {
      const ts = startOfDay(toGregorian(jy, jm, jd).getTime());
      onChange(Math.min(ts, max));
    } catch {
      /* تاریخ نامعتبر */
    }
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        type="number"
        min={1}
        max={31}
        value={j.jd}
        onChange={(e) => commit(j.jy, j.jm, Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
        className="tabular h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-2 text-center text-xs font-bold dark:border-white/10 dark:bg-white/5"
        aria-label="روز"
      />
      <select
        value={j.jm}
        onChange={(e) => commit(j.jy, Number(e.target.value), j.jd)}
        className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-2 text-xs font-bold dark:border-white/10 dark:bg-white/5"
        aria-label="ماه"
      >
        {J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select
        value={j.jy}
        onChange={(e) => commit(Number(e.target.value), j.jm, j.jd)}
        className="tabular h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-2 text-xs font-bold dark:border-white/10 dark:bg-white/5"
        aria-label="سال"
      >
        {years.map((y) => <option key={y} value={y}>{toFa(y)}</option>)}
      </select>
    </div>
  );
}

/** تقویم ماهانه با نمایش نمره روزها و امکان انتخاب */
function ScoreCalendar({
  selected, onToggle, onSelectRange, refMap, weekStart, onJumpRange,
}: {
  selected: Set<number>;
  onToggle: (day: number) => void;
  onSelectRange: (days: number[]) => void;
  refMap: Map<number, { score?: number | null; mood: number }>;
  weekStart: 'sat' | 'mon';
  onJumpRange: (r: DRange) => void;
}) {
  const nowJ = toJalaali(new Date());
  const [jy, setJy] = useState(nowJ.jy);
  const [jm, setJm] = useState(nowJ.jm);

  const grid = useMemo(() => getMonthGrid(jy, jm, weekStart), [jy, jm, weekStart]);
  const inMonth = grid.filter((c) => c.inMonth);
  const monthScores = inMonth.map((c) => refMap.get(c.ts)?.score).filter((s): s is number => s != null);
  const monthAvg = avg(monthScores);
  const weekLabels = weekStart === 'mon' ? ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی'] : J_WEEKDAYS_SHORT;

  const shift = (delta: number) => {
    const n = addMonthsJalali(jy, jm, delta);
    setJy(n.jy); setJm(n.jm);
  };
  const goToday = () => { setJy(nowJ.jy); setJm(nowJ.jm); };
  const monthRange: DRange = { start: inMonth[0]?.ts ?? todayStart(), end: inMonth[inMonth.length - 1]?.ts ?? todayStart() };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100">
            تقویم نمره — {J_MONTHS[jm - 1]} {toFa(jy)}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {monthAvg != null
              ? `میانگین این ماه: ${formatScore(monthAvg)} از ۱۰ • ${toFa(monthScores.length)} روز نمره‌دار`
              : 'در این ماه نمره‌ای ثبت نشده است'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shift(-1)} aria-label="ماه قبل" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <ChevronRight size={17} />
          </button>
          <Btn size="sm" variant="soft" onClick={goToday}>این ماه</Btn>
          <button onClick={() => shift(1)} aria-label="ماه بعد" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <ChevronLeft size={17} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 sm:px-5">
        <div className="grid grid-cols-7 gap-1">
          {weekLabels.map((w, i) => (
            <div key={w + i} className={cx('py-1.5 text-center text-[11px] font-black', (weekStart === 'sat' ? i === 6 : i === 5) ? 'text-rose-400' : 'text-slate-400')}>{w}</div>
          ))}
          {grid.map((cell, i) => {
            const ref = refMap.get(cell.ts);
            const score = ref?.score ?? null;
            const isSel = selected.has(cell.ts);
            const isToday = cell.ts === todayStart();
            const isFuture = cell.ts > todayStart();
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.003, 0.12) }}
                onClick={() => onToggle(cell.ts)}
                onDoubleClick={() => onJumpRange({ start: cell.ts, end: cell.ts })}
                title={`${formatJalali(cell.ts, { weekday: true })} — نمره: ${score != null ? `${
                  formatScore(score)} از ۱۰` : NOT_RECORDED}${ref ? ` • حال: ${moodLabel(ref.mood)}` : ''}${isSel ? ' • انتخاب‌شده' : ''}`}
                className={cx(
                  'relative flex min-h-[58px] flex-col items-center justify-center rounded-xl border-2 p-1 transition-all sm:min-h-[72px]',
                  isSel
                    ? 'border-violet-500 bg-violet-500/10 shadow-md shadow-violet-500/10'
                    : score != null
                      ? `${heatTone(score)} border-transparent`
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5',
                  !cell.inMonth && 'opacity-30',
                  isFuture && !isSel && 'opacity-45',
                )}
              >
                <span
                  className={cx(
                    'tabular grid h-6 w-6 place-items-center rounded-full text-[12px] font-black',
                    isToday ? 'bg-emerald-500 text-white'
                      : !cell.inMonth ? 'text-slate-500'
                        : 'text-slate-700 dark:text-slate-200',
                  )}
                >
                  {toFa(cell.jd)}
                </span>
                {score != null ? (
                  <span className="tabular mt-0.5 rounded-full bg-white/70 px-1.5 text-[10px] font-black text-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
                    {formatScore(score)}
                  </span>
                ) : (
                  <span className="mt-0.5 text-[9px] font-bold text-slate-400">{ref ? 'بدون نمره' : 'ثبت نشده'}</span>
                )}
                {isSel && (
                  <span className="absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-violet-500 text-white">
                    <CheckCheck size={10} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <button onClick={() => onSelectRange(inMonth.map((c) => c.ts))} className="rounded-xl bg-violet-500/10 px-2.5 py-1 font-bold text-violet-700 transition hover:bg-violet-500/20 dark:text-violet-300">
            انتخاب کل این ماه
          </button>
          <button onClick={() => onJumpRange(monthRange)} className="rounded-xl bg-slate-100 px-2.5 py-1 font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300">
            نمایش این ماه در بازه
          </button>
          <span className="flex-1" />
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-emerald-500/40" /> نمره بالا</span>
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-amber-500/30" /> متوسط</span>
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded bg-rose-500/25" /> پایین</span>
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded border border-dashed border-slate-300 dark:border-white/20" /> بدون نمره</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-400">یک کلیک = انتخاب/لغو انتخاب روز • دابل‌کلیک = محدود کردن بازه به همان روز</p>
      </div>
    </Card>
  );
}

function heatTone(score: number): string {
  if (score >= 8.5) return 'bg-emerald-500/45 dark:bg-emerald-500/35';
  if (score >= 7) return 'bg-emerald-500/30 dark:bg-emerald-500/22';
  if (score >= 5) return 'bg-amber-500/25 dark:bg-amber-500/18';
  if (score >= 3) return 'bg-rose-500/20 dark:bg-rose-500/15';
  return 'bg-rose-500/30 dark:bg-rose-500/22';
}

/** جدول هفتگی: میانگین نمره، حال، تسک و عادت هر هفته */
function WeeklyTable({ stats, weekStart, onPickWeek }: { stats: DayStats[]; weekStart: 'sat' | 'mon'; onPickWeek: (r: DRange) => void }) {
  const weeks = useMemo(() => {
    const map = new Map<number, DayStats[]>();
    for (const s of stats) {
      const key = startOfWeek(s.day, weekStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([start, items]) => {
        const scores = items.map((d) => d.score).filter((x): x is number => x != null);
        const mood = items.map((d) => d.mood).filter((x): x is number => x != null);
        const tasks = items.filter((d) => d.total > 0);
        return {
          start,
          end: addDays(start, 6),
          days: items.length,
          scored: scores.length,
          avgScore: avg(scores),
          avgMood: avg(mood),
          taskRate: tasks.length ? Math.round(avg(tasks.map((d) => d.pct)) ?? 0) : null,
          habits: items.reduce((a, d) => a + d.habitsDone, 0),
          habitsTotal: items.reduce((a, d) => a + d.habitsTotal, 0),
          sport: items.filter((d) => d.sport).length,
        };
      });
  }, [stats, weekStart]);

  return (
    <Card>
      <CardHead title="تحلیل هفتگی" sub="مقایسه هفته‌های بازه انتخابی — روی هر ردیف کلیک کنید تا بازه به همان هفته محدود شود" />
      <div className="overflow-x-auto px-5 pb-5">
        {weeks.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">داده‌ای برای نمایش نیست</p>
        ) : (
          <table className="w-full min-w-[520px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-white/10">
                <th className="py-2.5 font-bold">هفته</th>
                <th className="py-2.5 font-bold">روز</th>
                <th className="py-2.5 font-bold">میانگین نمره</th>
                <th className="py-2.5 font-bold">حال</th>
                <th className="py-2.5 font-bold">تسک‌ها</th>
                <th className="py-2.5 font-bold">عادت‌ها</th>
                <th className="py-2.5 font-bold">ورزش</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr
                  key={w.start}
                  onClick={() => onPickWeek({ start: w.start, end: w.end })}
                  className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/70 last:border-0 dark:border-white/5 dark:hover:bg-white/[0.03]"
                >
                  <td className="py-2.5 font-black text-slate-700 dark:text-slate-200">{rangeLabel(w.start, w.end)}</td>
                  <td className="tabular py-2.5 text-slate-500">{toFa(w.days)}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="tabular w-9 font-black text-slate-700 dark:text-slate-100">
                        {w.avgScore != null ? formatScore(w.avgScore) : '—'}
                      </span>
                      <div className="w-16">
                        <Progress value={w.avgScore != null ? (w.avgScore / SCORE_MAX) * 100 : 0} h={6} color={w.avgScore != null && w.avgScore >= 7 ? '#10b981' : '#f59e0b'} />
                      </div>
                      <span className="tabular text-[10px] text-slate-400">{toFa(w.scored)} روز</span>
                    </div>
                  </td>
                  <td className="py-2.5">{w.avgMood != null ? `${moodFace(Math.round(w.avgMood))} ${formatScore(w.avgMood)}` : '—'}</td>
                  <td className="tabular py-2.5 text-slate-600 dark:text-slate-300">{w.taskRate != null ? `${toFa(w.taskRate)}٪` : '—'}</td>
                  <td className="tabular py-2.5 text-slate-600 dark:text-slate-300">{w.habitsTotal ? `${toFa(w.habits)}/${toFa(w.habitsTotal)}` : '—'}</td>
                  <td className="tabular py-2.5 text-slate-600 dark:text-slate-300">{toFa(w.sport)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

/** جدول ماهانه شمسی */
function MonthlyTable({ stats, onPickMonth }: { stats: DayStats[]; onPickMonth: (r: DRange) => void }) {
  const months = useMemo(() => {
    const map = new Map<string, { start: number; end: number; jy: number; jm: number; items: DayStats[] }>();
    for (const s of stats) {
      const m = jalaliMonthRange(s.day);
      const key = `${m.jy}-${m.jm}`;
      const cur = map.get(key) ?? { start: m.start, end: m.end, jy: m.jy, jm: m.jm, items: [] };
      cur.items.push(s);
      map.set(key, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.jy - a.jy || b.jm - a.jm)
      .map((m) => {
        const scores = m.items.map((d) => d.score).filter((x): x is number => x != null);
        const mood = m.items.map((d) => d.mood).filter((x): x is number => x != null);
        return {
          ...m,
          scored: scores.length,
          avgScore: avg(scores),
          avgMood: avg(mood),
          habits: m.items.reduce((a, d) => a + d.habitsDone, 0),
          habitsTotal: m.items.reduce((a, d) => a + d.habitsTotal, 0),
          sport: m.items.filter((d) => d.sport).length,
        };
      });
  }, [stats]);

  return (
    <Card>
      <CardHead title="تحلیل ماهانه" sub="نمره و سبک زندگی در ماه‌های شمسی بازه انتخابی" />
      <div className="overflow-x-auto px-5 pb-5">
        {months.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">داده‌ای برای نمایش نیست</p>
        ) : (
          <table className="w-full min-w-[460px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-white/10">
                <th className="py-2.5 font-bold">ماه</th>
                <th className="py-2.5 font-bold">روزهای بازه</th>
                <th className="py-2.5 font-bold">نمره‌دار</th>
                <th className="py-2.5 font-bold">میانگین نمره</th>
                <th className="py-2.5 font-bold">میانگین حال</th>
                <th className="py-2.5 font-bold">عادت‌ها</th>
                <th className="py-2.5 font-bold">ورزش</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr
                  key={`${m.jy}-${m.jm}`}
                  onClick={() => onPickMonth({ start: m.start, end: m.end })}
                  className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/70 last:border-0 dark:border-white/5 dark:hover:bg-white/[0.03]"
                >
                  <td className="py-2.5 font-black text-slate-700 dark:text-slate-200">{J_MONTHS[m.jm - 1]} {toFa(m.jy)}</td>
                  <td className="tabular py-2.5 text-slate-500">{toFa(m.items.length)}</td>
                  <td className="tabular py-2.5 text-slate-500">{toFa(m.scored)}</td>
                  <td className="tabular py-2.5 font-black text-slate-700 dark:text-slate-100">{m.avgScore != null ? formatScore(m.avgScore) : '—'}</td>
                  <td className="py-2.5">{m.avgMood != null ? `${moodFace(Math.round(m.avgMood))} ${formatScore(m.avgMood)}` : '—'}</td>
                  <td className="tabular py-2.5 text-slate-600 dark:text-slate-300">{m.habitsTotal ? `${toFa(m.habits)}/${toFa(m.habitsTotal)}` : '—'}</td>
                  <td className="tabular py-2.5 text-slate-600 dark:text-slate-300">{toFa(m.sport)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

// ── سازنده‌های خروجی ────────────────────────────────────────
type SummaryState = {
  reflections: import('../lib/types').DayReflection[];
  tasks: import('../lib/types').Task[];
  habits: import('../lib/types').Habit[];
  habitLogs: Record<string, boolean>;
};

function ctxOf(state: SummaryState) {
  return { reflections: state.reflections, tasks: state.tasks, habits: state.habits, habitLogs: state.habitLogs };
}

function buildWeeksSummary(days: number[], state: SummaryState, opts: MultiSummaryOptions): string {
  const map = new Map<number, number[]>();
  for (const d of days) {
    const key = startOfWeek(d, 'sat');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  const weeks = [...map.entries()].sort((a, b) => a[0] - b[0]);
  const blocks = weeks.map(([start, list]) => {
    const end = list[list.length - 1];
    return buildMultiDaySummary(list, ctxOf(state), {
      ...opts,
      groupHeader: false,
      title: `هفته ${rangeLabel(start, end)}`,
    });
  });
  const head = opts.style === 'markdown'
    ? `## خلاصه هفتگی (${toFa(weeks.length)} هفته)\n${rangeLabel(days[0], days[days.length - 1])}`
    : `━━━━ خلاصه هفتگی (${toFa(weeks.length)} هفته) ━━━━\n${rangeLabel(days[0], days[days.length - 1])}`;
  return `${head}\n\n${blocks.join('\n\n════════════════════\n\n')}`;
}

function buildMonthsSummary(days: number[], state: SummaryState, opts: MultiSummaryOptions): string {
  const map = new Map<string, { start: number; jy: number; jm: number; list: number[] }>();
  for (const d of days) {
    const m = jalaliMonthRange(d);
    const key = `${m.jy}-${m.jm}`;
    const cur = map.get(key) ?? { start: m.start, jy: m.jy, jm: m.jm, list: [] };
    cur.list.push(d);
    map.set(key, cur);
  }
  const months = [...map.values()].sort((a, b) => a.jy - b.jy || a.jm - b.jm);
  const blocks = months.map((m) => buildMultiDaySummary(m.list, ctxOf(state), {
    ...opts,
    groupHeader: false,
    title: `${J_MONTHS[m.jm - 1]} ${toFa(m.jy)}`,
  }));
  const head = opts.style === 'markdown'
    ? `## خلاصه ماهانه (${toFa(months.length)} ماه)`
    : `━━━━ خلاصه ماهانه (${toFa(months.length)} ماه) ━━━━`;
  return `${head}\n\n${blocks.join('\n\n════════════════════\n\n')}`;
}

function buildCsvText(
  source: string,
  days: number[],
  stats: DayStats[],
  fields: FieldFlags,
  weekStart: 'sat' | 'mon',
): string {
  if (source === 'selected' || source === 'rangeScored' || source === 'rangeAll') {
    const rows = stats.map((d) => {
      const r = d.reflection;
      const row: Record<string, string | number> = {
        تاریخ: formatJalali(d.day),
        کد: formatJalaliShort(d.day),
        روز_هفته: weekdayName(d.day),
      };
      if (fields.score) row['نمره_۰تا۱۰'] = d.score != null ? d.score : 'ثبت نشده';
      if (fields.mood) row['حال_روز'] = r?.mood != null ? moodLabel(r.mood) : 'ثبت نشده';
      if (fields.progress) {
        row['تسک_انجام‌شده'] = d.total ? `${d.done} از ${d.total}` : 'ثبت نشده';
        row['عادت_انجام‌شده'] = d.habitsTotal ? `${d.habitsDone} از ${d.habitsTotal}` : 'ثبت نشده';
      }
      if (fields.basics) {
        row['ساعت_بیداری'] = r?.wake ? clockToFa(r.wake) : 'ثبت نشده';
        row['ساعت_خواب'] = r?.sleep ? clockToFa(r.sleep) : 'ثبت نشده';
        row['ورزش'] = r?.sport ? (r.sportType || 'بله') : 'ثبت نشده';
        row['بیرون_رفتن'] = r?.wentOut ? (r.outPlace || 'بله') : 'ثبت نشده';
      }
      if (fields.dayNote) row['یادداشت_روز'] = (r?.dayNote ?? '').trim() || 'خالی';
      if (fields.wins) row['دستاوردها'] = (r?.wins ?? '').trim() || 'خالی';
      if (fields.improve) row['قابل_بهبود'] = (r?.improve ?? '').trim() || 'خالی';
      if (fields.lessons) row['درس_آموخته'] = (r?.lessons ?? '').trim() || 'خالی';
      if (fields.gratitude) row['قدردانی'] = (r?.gratitude ?? '').trim() || 'خالی';
      row['موارد_ثبت‌نشده'] = missingFields(r).join('، ') || 'هیچ‌کدام';
      return row;
    });
    return exportRowsCsv(rows);
  }

  // هفتگی/ماهانه: تجمیع
  const groups = new Map<string, DayStats[]>();
  for (const d of stats) {
    const key = source === 'weeks'
      ? `هفته ${rangeLabel(startOfWeek(d.day, weekStart), addDays(startOfWeek(d.day, weekStart), 6))}`
      : `${J_MONTHS[jalaliMonthRange(d.day).jm - 1]} ${toFa(jalaliMonthRange(d.day).jy)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  const rows = [...groups.entries()].map(([label, items]) => {
    const scores = items.map((d) => d.score).filter((x): x is number => x != null);
    const row: Record<string, string | number> = { بازه: label, تعداد_روز: items.length };
    if (fields.score) {
      row['میانگین_نمره'] = avg(scores) != null ? (avg(scores) as number).toFixed(1) : 'ثبت نشده';
      row['میانه_نمره'] = median(scores) != null ? (median(scores) as number).toFixed(1) : 'ثبت نشده';
      row['روزهای_نمره‌دار'] = scores.length;
    }
    if (fields.mood) {
      const moods = items.map((d) => d.mood).filter((x): x is number => x != null);
      row['میانگین_حال'] = avg(moods) != null ? (avg(moods) as number).toFixed(1) : 'ثبت نشده';
    }
    if (fields.progress) {
      const withTasks = items.filter((d) => d.total > 0);
      row['میانگین_انجام_تسک'] = withTasks.length ? `${Math.round(avg(withTasks.map((d) => d.pct)) ?? 0)}٪` : 'ثبت نشده';
      const hab = items.reduce((a, d) => a + d.habitsDone, 0);
      const habTotal = items.reduce((a, d) => a + d.habitsTotal, 0);
      row['عادت_ها'] = habTotal ? `${hab} از ${habTotal}` : 'ثبت نشده';
    }
    if (fields.basics) {
      row['روزهای_ورزش'] = items.filter((d) => d.sport).length;
      row['روزهای_بیرون'] = items.filter((d) => d.wentOut).length;
    }
    void days;
    return row;
  });
  return exportRowsCsv(rows);
}
