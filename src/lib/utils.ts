import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number): string {
  return `¥${n.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().substring(0, 10);
}

/** YYYY-M-D (no leading zeros, e.g. 2026-7-11) */
export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

/** 采购单日期范围显示: "2026-07-12~2026-07-31" → "2026-7-12 ~ 2026-7-31"; 单日直接显示 */
export function formatPurchaseDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string' && dateStr.includes('~')) {
    const [from, to] = dateStr.split('~');
    if (from === to) return formatShortDate(from);
    return `${formatShortDate(from)} ~ ${formatShortDate(to)}`;
  }
  return formatShortDate(dateStr);
}

export function now(): string {
  return new Date().toISOString();
}

export function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let idCounter = 100;
export function genId(): number {
  return ++idCounter;
}

/** 数字金额转中文大写，如 4126 → 肆仟壹佰贰拾陆元整 */
const CN_NUMS = ['零','壹','贰','叁','肆','伍','陆','柒','捌','玖'];
const CN_UNITS = ['','拾','佰','仟'];
const CN_BIG_UNITS = ['','万','亿','万亿'];
export function amountToCn(amount: number): string {
  if (isNaN(amount) || amount < 0) return '零元整';
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  if (intPart === 0 && decPart === 0) return '零元整';
  
  function convertInt(n: number): string {
    if (n === 0) return '';
    let str = '';
    let zero = false;
    const digits = String(n).split('').map(Number);
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      const d = digits[i];
      const pos = len - 1 - i;
      if (d === 0) {
        zero = true;
      } else {
        if (zero) { str += '零'; zero = false; }
        str += CN_NUMS[d] + CN_UNITS[pos % 4];
      }
      if (pos % 4 === 0 && pos > 0) {
        str += CN_BIG_UNITS[Math.floor(pos / 4)];
        zero = false;
      }
    }
    return str;
  }
  
  let result = convertInt(intPart) + '元';
  if (decPart === 0) {
    result += '整';
  } else {
    const jiao = Math.floor(decPart / 10);
    const fen = decPart % 10;
    if (jiao > 0) result += CN_NUMS[jiao] + '角';
    else if (fen > 0) result += '零';
    if (fen > 0) result += CN_NUMS[fen] + '分';
  }
  return result;
}
