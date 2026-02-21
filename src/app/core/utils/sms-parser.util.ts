export interface ParsedSMS {
  id: string;
  amount: number;
  description: string;
  merchantName?: string;

  type: 'debit' | 'credit';
  status: 'success' | 'failed' | 'pending' | 'reversed';

  date: Date;

  accountType?: string;
  accountIdentifier?: string;

  availableBalance?: number;

  upiId?: string;
  upiRef?: string;

  sender?: string;
  confidence: number;

  isTransfer?: boolean; // New: identify bank-to-bank transfers
  transferPairId?: string;
  smsId?: string; // unique SMS reference for deduplication
  originalBody: string;
}

/* ---------- KEYWORDS ---------- */

const DEBIT_WORDS = [
  'debited', 'spent', 'paid', 'purchase', 'withdrawn', 'deducted',
  'sent', 'transfer', 'dr', 'txn', 'swipe', 'charged', 'payment'
];

const CREDIT_WORDS = [
  'credited', 'received', 'deposit', 'refund', 'cashback',
  'reversal', 'cr', 'salary', 'added', 'money in'
];

const FAIL_WORDS = ['failed', 'declined', 'unsuccessful', 'blocked', 'insufficient'];
const PENDING_WORDS = ['pending', 'processing', 'await'];
const REVERSED_WORDS = ['reversed', 'reversal'];

/* ---------- AMOUNT (transaction-focused) ---------- */

// Supports: Rs. 100, Rs 100, INR 100, ₹ 100, Amt: 100, also suffixes
const TXN_AMOUNT_REGEX =
  /(?:rs\.?|inr|₹|amt|amount|price)[:\s]*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited|paid|received|spent)/i;

function extractAmount(body: string): number | null {
  const m = body.match(TXN_AMOUNT_REGEX);
  if (!m) return null;

  // Capture group 1 is for prefix-style (Rs 100), Group 2 is for suffix-style (100 debited)
  const valStr = m[1] || m[2];
  if (!valStr) return null;

  const val = parseFloat(valStr.replace(/,/g, ''));
  return isNaN(val) ? null : val;
}

/* ---------- BALANCE ---------- */

const BAL_REGEX =
  /(?:avl|available)\s*bal(?:ance)?[:\s]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;

function extractBalance(body: string): number | undefined {
  const m = body.match(BAL_REGEX);
  if (!m) return;

  return parseFloat(m[1].replace(/,/g, ''));
}

/* ---------- ACCOUNT LAST DIGITS ---------- */

const ACC_REGEX =
  /(?:a\/c|acct|account|card|ending with)[^\d]{0,10}(\d{3,6})/i;

function extractAccount(body: string): string | undefined {
  return body.match(ACC_REGEX)?.[1];
}

/* ---------- UPI ---------- */

const UPI_ID_REGEX = /([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/;
const UPI_REF_REGEX = /(UPI|Ref|Ref No)[^\d]{0,6}(\d{8,})/i;

function extractUPI(body: string) {
  return {
    upiId: body.match(UPI_ID_REGEX)?.[1],
    upiRef: body.match(UPI_REF_REGEX)?.[2]
  };
}

/* ---------- MERCHANT ---------- */

const MERCHANT_REGEX =
  /(?:to|at|from|towards|info)\s+([A-Za-z0-9&.\- *]{3,50})/i;

function extractMerchant(body: string): string | undefined {
  const m = body.match(MERCHANT_REGEX);
  if (!m) return;

  const raw = m[1].trim();
  // ignore if it's just "Rs" or common words
  if (/^(rs|inr|account|bank|your)$/i.test(raw)) return;

  return raw;
}

/* ---------- DATE ---------- */

const DATE_REGEX =
  /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{1,2}[A-Za-z]{3}\d{2,4})/;

function extractDate(body: string): Date | undefined {
  const m = body.match(DATE_REGEX);
  if (!m) return;

  const d = new Date(m[0]);
  return isNaN(d.getTime()) ? undefined : d;
}

/* ---------- TYPE ---------- */

function detectType(body: string): 'debit' | 'credit' {
  const l = body.toLowerCase();

  const d = DEBIT_WORDS.some(w => l.includes(w));
  const c = CREDIT_WORDS.some(w => l.includes(w));

  if (c && !d) return 'credit';
  return 'debit';
}

/* ---------- TRANSFER DETECTION ---------- */

function detectIsTransfer(body: string): boolean {
  const l = body.toLowerCase();
  const transferKeywords = ['transfer to', 'to self', 'own account', 'transfer from', 'to account ending', 'to a/c', 'transferred to your account', 'imps to a/c', 'upi to self'];

  // If it's a "debit" but contains "transfer" and "ref/id", it's likely a transfer
  const hasTransferWords = transferKeywords.some(w => l.includes(w));

  // Also check if it explicitly mentions "transfer to self" or similar patterns
  if (l.includes('self transfer') || l.includes('own bank a/c') || l.includes('between accounts') || l.includes('to self')) {
    return true;
  }

  return hasTransferWords;
}

/* ---------- STATUS ---------- */

function detectStatus(body: string): ParsedSMS['status'] {
  const l = body.toLowerCase();

  if (FAIL_WORDS.some(w => l.includes(w))) return 'failed';
  if (PENDING_WORDS.some(w => l.includes(w))) return 'pending';
  if (REVERSED_WORDS.some(w => l.includes(w))) return 'reversed';

  return 'success';
}

/* ---------- ACCOUNT TYPE ---------- */

function detectAccountType(body: string): string | undefined {
  const l = body.toLowerCase();

  if (l.includes('upi')) return 'UPI';
  if (l.includes('credit card') || l.includes('cc')) return 'Credit Card';
  if (l.includes('debit card')) return 'Debit Card';
  if (l.includes('atm')) return 'ATM';
  if (l.includes('netbanking')) return 'NetBanking';

  return 'Bank';
}

/* ---------- CONFIDENCE ---------- */

function calcConfidence(amount: number | null, merchant?: string) {
  let score = 0.4;

  if (amount) score += 0.3;
  if (merchant) score += 0.2;

  return Math.min(score, 1);
}

/* ---------- MAIN PARSER ---------- */

export function parseSMS(
  body: string,
  sender?: string,
  id?: string
): ParsedSMS | null {

  const amount = extractAmount(body);
  if (!amount) return null;

  const status = detectStatus(body);
  // We keep all for now to help debugging, but the service might filter them
  // if (status === 'failed') return null; 

  const merchant = extractMerchant(body);
  const balance = extractBalance(body);
  const account = extractAccount(body);
  const upi = extractUPI(body);
  const date = extractDate(body) ?? new Date();

  return {
    id: id || `${Date.now()}-${Math.random()}`,
    smsId: id || `${Date.now()}-${Math.random()}`, // Deduplication anchor

    amount,
    description: merchant || 'Bank Transaction',
    merchantName: merchant,

    type: detectType(body),
    status,

    date,

    accountType: detectAccountType(body),
    accountIdentifier: account,

    availableBalance: balance,

    upiId: upi.upiId,
    upiRef: upi.upiRef,

    sender,
    confidence: calcConfidence(amount, merchant),
    isTransfer: detectIsTransfer(body),

    originalBody: body
  };
}

/* ---------- MULTIPLE ---------- */

export function parseMultipleSMS(
  messages: { body: string; date?: Date; sender?: string }[]
): ParsedSMS[] {

  const seen = new Set<string>();

  return messages
    .map((m, i) => {
      // Create a deterministic hash/id for deduplication based on SMS text and timestamp
      const deterministicId = m.date
        ? `sms-${m.date.getTime()}-${m.body.substring(0, 20).replace(/\s/g, '')}`
        : `sms-${Date.now()}-${i}`;

      const parsed = parseSMS(
        m.body,
        m.sender,
        deterministicId
      );

      if (!parsed) return null;

      const key =
        parsed.amount +
        parsed.type +
        parsed.merchantName +
        parsed.date.toDateString();

      if (seen.has(key)) return null;

      seen.add(key);

      if (m.date) parsed.date = m.date;

      return parsed;
    })
    .filter(Boolean) as ParsedSMS[];
}
