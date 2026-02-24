import { ParsedSMS } from '../sms/models/parsed-sms.model';

/* ---------- KEYWORDS ---------- */

export const DEBIT_WORDS = [
  'debited', 'spent', 'paid', 'purchase', 'withdrawn', 'deducted',
  'sent', 'transfer', 'dr', 'txn', 'swipe', 'charged', 'payment'
];

export const CREDIT_WORDS = [
  'credited', 'received', 'deposit', 'refund', 'cashback',
  'reversal', 'cr', 'salary', 'added', 'money in'
];

export const FAIL_WORDS = ['failed', 'declined', 'unsuccessful', 'blocked', 'insufficient'];
export const PENDING_WORDS = ['pending', 'processing', 'await'];
export const REVERSED_WORDS = ['reversed', 'reversal'];

export const LOAN_IGNORE_WORDS = ['loan', 'eligibility', 'pre-approved', 'eligible', 'apply for', 'offer', 'personal loan', 'credit limit', 'pre approved', 'kcc', 'emi'];

export const GENERIC_TXN_WORDS = [
  'upi', 'imps', 'neft', 'rtgs', 'txn id', 'utr', 'ref no', 'avl bal', 'card ending', 'paid to'
];

export const PROMO_WORDS = [
  'offer', 'deal', 'sale', 'buy', 'shop', 'get', 'starting at',
  'just', 'only', 'limited', 'discount', 'festive', 'diwali',
  'weekend', 'gaming laptop', 'smartphone', 'camera', 'clearance',
  'hurry', 'exclusive', 'price', 'no cost', 'down payment', 'win', 'chance',
  'reward', 'points', 'redeem', 'claim'
];

export function hasTransactionKeywords(body: string): boolean {
  const l = body.toLowerCase();
  const d = DEBIT_WORDS.some(w => l.includes(w));
  const c = CREDIT_WORDS.some(w => l.includes(w));
  const g = GENERIC_TXN_WORDS.some(w => l.includes(w));
  return d || c || g;
}

export function isPromotional(body: string): boolean {
  const l = body.toLowerCase();
  return PROMO_WORDS.some(w => l.includes(w));
}

export function cleanSender(sender?: string): { name: string, category: string } {
  if (!sender) return { name: '', category: '' };
  // Format: [Operator]-[Sender]-[Category] e.g., VM-HDFCBK-T
  let cleaned = sender.replace(/^[A-Za-z]{2}-/i, '');
  let category = '';
  const match = cleaned.match(/-([A-Za-z0-9])$/i);
  if (match) {
    category = match[1].toUpperCase();
    cleaned = cleaned.replace(/-[A-Za-z0-9]$/i, '');
  }
  return { name: cleaned.toUpperCase(), category };
}

/* ---------- AMOUNT (transaction-focused) ---------- */

// Supports: Rs. 100, Rs 100, INR 100, ₹ 100, Amt: 100
const TXN_AMOUNT_REGEX =
  /(?:rs\.?|inr|₹|amt|amount|price)\s*([\d,]+(?:\.\d{1,2})?)/i;

const TXN_AMOUNT_FALLBACK_REGEX =
  /(?:debited|credited|deducted|received|spent)(?:\s+by)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;

export function extractAmount(body: string): number | null {
  let m = body.match(TXN_AMOUNT_REGEX);
  if (!m) {
    m = body.match(TXN_AMOUNT_FALLBACK_REGEX);
  }
  if (!m) return null;

  const valStr = m[1];
  if (!valStr) return null;

  const val = parseFloat(valStr.replace(/,/g, ''));
  return isNaN(val) ? null : val;
}

/* ---------- BALANCE ---------- */

const BAL_REGEX =
  /(?:avl|available)\s*bal(?:ance)?[:\s]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;

export function extractBalance(body: string): number | undefined {
  const m = body.match(BAL_REGEX);
  if (!m) return;

  return parseFloat(m[1].replace(/,/g, ''));
}

/* ---------- ACCOUNT LAST DIGITS ---------- */

const ACC_REGEX =
  /(?:a\/c|acct|account|card|ending with)[^\d]{0,10}(\d{3,6})/i;

export function extractAccount(body: string): string | undefined {
  return body.match(ACC_REGEX)?.[1];
}

/* ---------- UPI ---------- */

const UPI_ID_REGEX = /([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/;
const UPI_REF_REGEX = /(?:UPI|Ref|Ref No|Txn Id|TxnId|UTR)[^\d]{0,6}(\d{8,})/i;

export function extractUPI(body: string) {
  return {
    upiId: body.match(UPI_ID_REGEX)?.[1],
    upiRef: body.match(UPI_REF_REGEX)?.[1]
  };
}

/* ---------- MERCHANT ---------- */

const MERCHANT_REGEX =
  /(?:to|at|towards|info|linked to|via|upi to|received from)\s+([A-Za-z0-9&.\- *@]{3,50})/i;

export function extractMerchant(body: string, sender?: string): string | undefined {
  const m = body.match(MERCHANT_REGEX);
  let raw = '';

  // Rule 1: Explicit merchant keyword
  if (m) {
    raw = m[1].trim();
  }

  // Rule 2: UPI Payee/ID if no explicit merchant found or extracted merchant is just a UPI ID
  const upiMatch = body.match(/([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/);
  if ((!raw || raw === upiMatch?.[1]) && upiMatch) {
    raw = upiMatch[1];
  }

  // Rule 3: Fallback to ATM/Cash
  if (!raw && detectAccountType(body) === 'ATM') {
    raw = 'ATM Withdrawal';
  }

  // Rule 4: Fallback to sender
  if (!raw && sender) {
    raw = sender.substring(0, 15);
  }

  if (!raw) return undefined;

  // --- CLEANUP ---

  const cleanupRegex = /\s+(?:is credited|is debited|txn|ref|upi|avl|bal|balance|on|at|via|with).*$/i;
  raw = raw.replace(cleanupRegex, '').trim();
  raw = raw.replace(/[.,:;()]+$/, '').trim();

  if (/^\d+$/.test(raw)) {
    raw = '';
  }

  if (/^(rs|inr|account|bank|your|self|towards|upi)$/i.test(raw)) return undefined;

  return raw || undefined;
}

/* ---------- DATE ---------- */

const DATE_REGEX =
  /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{1,2}[\s\-]?[A-Za-z]{3}[\s\-]?\d{2,4})/;

export function extractDate(body: string): Date | undefined {
  const m = body.match(DATE_REGEX);
  if (!m) return;

  const d = new Date(m[0]);
  return isNaN(d.getTime()) ? undefined : d;
}

/* ---------- TYPE ---------- */

export function detectType(body: string): 'debit' | 'credit' {
  const l = body.toLowerCase();

  const d = DEBIT_WORDS.some(w => l.includes(w));
  const c = CREDIT_WORDS.some(w => l.includes(w));

  if (c && d) return 'debit';
  if (c && !d) return 'credit';
  return 'debit';
}

/* ---------- TRANSFER DETECTION ---------- */

export function detectIsTransfer(body: string): boolean {
  const l = body.toLowerCase();

  const d = DEBIT_WORDS.some(w => l.includes(w));
  const c = CREDIT_WORDS.some(w => l.includes(w));
  if (d && c) return true;

  const transferKeywords = ['transfer to', 'to self', 'own account', 'transfer from', 'to account ending', 'to a/c', 'transferred to your account', 'imps to a/c', 'upi to self', 'self transfer', 'own bank a/c', 'between accounts'];

  return transferKeywords.some(w => l.includes(w));
}

/* ---------- STATUS ---------- */

export function detectStatus(body: string): ParsedSMS['status'] {
  const l = body.toLowerCase();

  if (FAIL_WORDS.some(w => l.includes(w))) return 'failed';
  if (PENDING_WORDS.some(w => l.includes(w))) return 'pending';
  if (REVERSED_WORDS.some(w => l.includes(w))) return 'reversed';

  return 'success';
}

/* ---------- ACCOUNT TYPE ---------- */

export function detectAccountType(body: string): string | undefined {
  const l = body.toLowerCase();

  if (l.includes('upi')) return 'UPI';
  if (l.includes('credit card') || l.includes('cc')) return 'Credit Card';
  if (l.includes('debit card')) return 'Debit Card';
  if (l.includes('atm')) return 'ATM';
  if (l.includes('netbanking')) return 'NetBanking';

  return 'Bank';
}

