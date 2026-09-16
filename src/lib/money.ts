import { useApp } from './store';
import { formatMoney, moneyUnitLabel } from './utils';

/** قالب‌بندی مبلغ بر اساس واحد انتخابی کاربر (تومان / هزار تومان) */
export function useMoney() {
  const { state } = useApp();
  const unit = state.settings.unit;
  const fmt = (n: number) => formatMoney(n, unit);
  const withUnit = (n: number) => `${formatMoney(n, unit)} ${moneyUnitLabel(unit)}`;
  const full = (n: number) => `${formatMoney(n, 'toman')} تومان`;
  return { fmt, withUnit, full, unit };
}
