import { useEffect, useState } from 'react';

/**
 * زمان جاری به شکل timestamp، با به‌روزرسانی خودکار هر دقیقه.
 * استفاده از این هوک به‌جای `Date.now()` مستقیم داخل رندر باعث می‌شود
 * محاسبات وابسته به «اکنون» (مثل عقب‌افتاده‌بودن تسک) به‌موقع تازه شوند.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), Math.max(5_000, intervalMs));
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** آیا کلید فشرده‌شده با میان‌بر ترکیبی مطابقت دارد؟ (⌘ روی مک، Ctrl روی ویندوز) */
export function isShortcut(e: KeyboardEvent, key: string, shift = false): boolean {
  return (e.metaKey || e.ctrlKey) && e.shiftKey === shift && e.key.toLowerCase() === key.toLowerCase();
}
