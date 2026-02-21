export interface ParsedSMS {
  id: string;
  amount: number;
  description: string;
  merchantName?: string;
  userCategory?: string; // New: optional overridden category
  userCategoryLabel?: string; // New: optional overridden category label

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

const GENERIC_TXN_WORDS = [
  'upi', 'imps', 'neft', 'rtgs', 'txn id', 'utr', 'ref no', 'avl bal', 'card ending', 'paid to'
];

function hasTransactionKeywords(body: string): boolean {
  const l = body.toLowerCase();
  const d = DEBIT_WORDS.some(w => l.includes(w));
  const c = CREDIT_WORDS.some(w => l.includes(w));
  const g = GENERIC_TXN_WORDS.some(w => l.includes(w));
  return d || c || g;
}

function cleanSender(sender?: string): { name: string, category: string } {
  if (!sender) return { name: '', category: '' };
  // Format: [Operator]-[Sender]-[Category] e.g., VM-HDFCBK-T
  let cleaned = sender.replace(/^[A-Z]{2}-/i, '');
  let category = '';
  const match = cleaned.match(/-([A-Z])$/i);
  if (match) {
    category = match[1].toUpperCase();
    cleaned = cleaned.replace(/-[A-Z]$/i, '');
  }
  return { name: cleaned, category };
}

/* ---------- AMOUNT (transaction-focused) ---------- */

// Supports: Rs. 100, Rs 100, INR 100, ₹ 100, Amt: 100
// Note: We intentionally avoid simply looking for `[number] debited` without a currency prefix,
// because Indian banks frequently write `A/c *6493 debited` which falsely extracts 6493.
const TXN_AMOUNT_REGEX =
  /(?:rs\.?|inr|₹|amt|amount|price)\s*([\d,]+(?:\.\d{1,2})?)/i;

function extractAmount(body: string): number | null {
  const m = body.match(TXN_AMOUNT_REGEX);
  if (!m) return null;

  const valStr = m[1];
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
const UPI_REF_REGEX = /(?:UPI|Ref|Ref No|Txn Id|TxnId|UTR)[^\d]{0,6}(\d{8,})/i;

function extractUPI(body: string) {
  return {
    upiId: body.match(UPI_ID_REGEX)?.[1],
    upiRef: body.match(UPI_REF_REGEX)?.[1]
  };
}

/* ---------- MERCHANT ---------- */

const MERCHANT_REGEX =
  /(?:to|at|from|towards|info|linked to|via|upi to)\s+([A-Za-z0-9&.\- *@]{3,50})/i;

function extractMerchant(body: string, sender?: string): string | undefined {
  const m = body.match(MERCHANT_REGEX);
  let raw = '';

  // Rule 1: Explicit merchant keyword
  if (m) {
    raw = m[1].trim();
  }

  // Rule 2: UPI Payee/ID if no explicit merchant found or extracted merchant is just a UPI ID
  const upiMatch = body.match(/([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/);
  if ((!raw || raw === upiMatch?.[1]) && upiMatch) {
    // If the entire raw string is just the UPI ID, or no raw string found, use UPI ID.
    // The cleanup will handle stripping the '@bank' part later if preferred.
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

  // Remove known junk phrases that might follow the merchant name
  const cleanupRegex = /\s+(?:is credited|is debited|txn|ref|upi|avl|bal|balance|on|at|via|with).*$/i;
  raw = raw.replace(cleanupRegex, '').trim();

  // Strip trailing punctuation
  raw = raw.replace(/[.,:;()]+$/, '').trim();

  // If the extracted merchant is literally just a number (likely a txn ref we accidentally caught), clear it
  if (/^\d+$/.test(raw)) {
    raw = '';
  }

  // Ignore if it's just common words
  if (/^(rs|inr|account|bank|your|self|towards|upi)$/i.test(raw)) return undefined;

  return raw || undefined;
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

  // If both exist, it's highly likely a transfer. For the base type, we'll arbitrarily say debit
  // because the money left the primary notified account first. The isTransfer flag will handle the rest.
  if (c && d) return 'debit';
  if (c && !d) return 'credit';
  return 'debit';
}

/* ---------- TRANSFER DETECTION ---------- */

function detectIsTransfer(body: string): boolean {
  const l = body.toLowerCase();

  // Rule 1: Dual Debit + Credit in same SMS = Transfer
  const d = DEBIT_WORDS.some(w => l.includes(w));
  const c = CREDIT_WORDS.some(w => l.includes(w));
  if (d && c) return true;

  // Rule 2: Explicit Transfer Keywords
  const transferKeywords = ['transfer to', 'to self', 'own account', 'transfer from', 'to account ending', 'to a/c', 'transferred to your account', 'imps to a/c', 'upi to self', 'self transfer', 'own bank a/c', 'between accounts'];

  return transferKeywords.some(w => l.includes(w));
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

  if (!hasTransactionKeywords(body)) return null;

  const { name: cleanedSenderName } = cleanSender(sender);

  const status = detectStatus(body);
  // We keep all for now to help debugging, but the service might filter them
  // if (status === 'failed') return null; 

  const merchant = extractMerchant(body, cleanedSenderName);
  const balance = extractBalance(body);
  const account = extractAccount(body);
  const upi = extractUPI(body);
  const date = extractDate(body) ?? new Date();

  return {
    id: id || `${Date.now()}-${Math.random()}`,
    smsId: id || `${Date.now()}-${Math.random()}`, // Deduplication anchor

    amount,
    description: merchant || 'Bank Transaction',
    merchantName: merchant || 'Unknown Merchant',

    type: detectType(body),
    status,

    date,

    accountType: detectAccountType(body),
    accountIdentifier: account,

    availableBalance: balance,

    upiId: upi.upiId,
    upiRef: upi.upiRef,

    sender: cleanedSenderName,
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
