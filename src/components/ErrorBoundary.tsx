import { Component, type ReactNode } from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';

/**
 * مرز خطا: اگر یک صفحه به‌خاطر داده خراب یا باگ کرش کند،
 * کل برنامه سفید نمی‌شود و راه برگشت نمایش داده می‌شود.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: unknown }> {
  state = { err: null as unknown };

  static getDerivedStateFromError(err: unknown) {
    return { err };
  }

  componentDidCatch(err: unknown) {
    try {
      console.error('[life-desk] render error:', err);
    } catch {
      /* ignore */
    }
  }

  render() {
    if (this.state.err == null) return this.props.children;
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-rose-500/10 text-rose-500">
          <TriangleAlert size={30} />
        </div>
        <h2 className="text-lg font-black text-slate-800 dark:text-white">مشکلی پیش آمد 😞</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-7 text-slate-500 dark:text-slate-400">
          این صفحه به خطا خورد ولی داده‌های شما در مرورگر سالم است. معمولاً با بارگذاری مجدد درست می‌شود.
          اگر مشکل ادامه داشت، از بخش تنظیمات یک پشتیبان بگیرید و فایل را بررسی کنید.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => this.setState({ err: null })}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-[13px] font-bold text-white transition hover:bg-emerald-700"
          >
            <RotateCcw size={15} /> تلاش مجدد
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            بارگذاری مجدد صفحه
          </button>
        </div>
      </div>
    );
  }
}
