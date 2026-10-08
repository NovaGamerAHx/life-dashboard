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
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-danger/10 text-danger-ink">
          <TriangleAlert size={30} />
        </div>
        <h2 className="text-lg font-black text-ink ">مشکلی پیش آمد 😞</h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-7 text-muted ">
          این صفحه به خطا خورد ولی داده‌های شما در مرورگر سالم است. معمولاً با بارگذاری مجدد درست می‌شود.
          اگر مشکل ادامه داشت، از بخش تنظیمات یک پشتیبان بگیرید و فایل را بررسی کنید.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => this.setState({ err: null })}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-[13px] font-bold text-white transition hover:bg-brand-strong"
          >
            <RotateCcw size={15} /> تلاش مجدد
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-line px-4 text-[13px] font-bold text-ink-2 transition hover:bg-surface-2   "
          >
            بارگذاری مجدد صفحه
          </button>
        </div>
      </div>
    );
  }
}
