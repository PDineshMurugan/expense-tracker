/**
 * SMS Parser Utility
 * Parses Indian bank SMS messages to extract transaction details.
 * 
 * Supports most major Indian banks and payment providers:
 * - HDFC, ICICI, Axis, SBI, Kotak, Yes Bank, IndusInd, IDBI, RBL
 * - UPI providers: Google Pay, PhonePe, Paytm, WhatsApp Pay, BHIM
 * - E-commerce: Amazon, Flipkart, Myntra, etc.
 * - Food delivery: Swiggy, Zomato, Uber Eats
 * - Travel: MakeMyTrip, OYO, GoIbibo
 */

export interface ParsedSMS {
    id: string;
    amount: number;
    description: string;
    type: 'debit' | 'credit';
    date: Date;
    accountType?: string;
    merchantName?: string;
    originalBody: string;
}

/**
 * Comprehensive regex patterns for Indian bank SMS formats
 */
const AMOUNT_PATTERNS = [
    // "Rs. 500" or "Rs.500" or "₹ 500"
    /(?:Rs\.?|INR|₹)\s*(?:[-+]?\s*)?([\d,]+(?:\.\d{1,2})?)/gi,
    // "debited Rs 500" or "credited INR 500"
    /(?:debited|credited|spent|paid|received|withdrawn)\s*(?:Rs\.?|INR|₹)?\s*(?:[-+]?\s*)?([\d,]+(?:\.\d{1,2})?)/gi,
    // "500 has been debited"
    /([\d,]+(?:\.\d{1,2})?)\s*(?:has been|was|is)\s*(?:debited|credited)/gi,
    // Direct amount: "Amount: 500"
    /(?:amount|amt|value|paid)[\s:]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/gi,
];

const DEBIT_KEYWORDS = [
    'debited', 'spent', 'paid', 'purchase', 'withdrawn',
    'deducted', 'txn', 'transaction', 'debit', 'payment',
    'transferred', 'sent', 'transfer out', 'swipe', 'charged',
    'settlement', 'purchase', 'balance', 'consumption'
];

const CREDIT_KEYWORDS = [
    'credited', 'received', 'refund', 'cashback', 'reversal',
    'credit', 'deposit', 'added', 'reward', 'bonus',
    'transfer in', 'received', 'reimbursement', 'salary'
];

const ACCOUNT_TYPE_PATTERNS: { pattern: RegExp; type: string }[] = [
    { pattern: /google\s*pay|gpay/i, type: 'Google Pay' },
    { pattern: /phonepe|phone\s*pe/i, type: 'PhonePe' },
    { pattern: /paytm/i, type: 'Paytm' },
    { pattern: /whatsapp\s*pay|whatsapp/i, type: 'WhatsApp Pay' },
    { pattern: /bhim/i, type: 'BHIM' },
    { pattern: /upi/i, type: 'UPI' },
    { pattern: /credit\s*card|cc/i, type: 'Credit Card' },
    { pattern: /debit\s*card|visa|mastercard|rupay/i, type: 'Debit Card' },
    { pattern: /neft|rtgs|imps/i, type: 'Bank Transfer' },
    { pattern: /netbanking|internet\s*banking/i, type: 'NetBanking' },
    { pattern: /wallet/i, type: 'Wallet' },
    { pattern: /atm|cash|withdrawal/i, type: 'ATM/Cash' },
];

const MERCHANT_PATTERNS: { pattern: RegExp; extract: (match: RegExpMatchArray) => string }[] = [
    // "at Amazon India" or "to Swiggy"
    { pattern: /(?:at|to|from)\s+([A-Za-z0-9\s&.'-]{3,40})/i, extract: (m) => m[1] },
    // "Info: Starbucks" or "REF Zomato"
    { pattern: /(?:Info|REF|Ref|Description)[\s:]+([A-Za-z0-9\s&.'-]{3,40})/i, extract: (m) => m[1] },
    // "Merchant: Name"
    { pattern: /(?:Merchant|Vendor|Store)[\s:]+([A-Za-z0-9\s&.'-]{3,40})/i, extract: (m) => m[1] },
    // Common merchant names pattern
    { pattern: /(?:Amazon|Flipkart|Myntra|Swiggy|Zomato|Uber|Ola|OYO|MakeMyTrip|Paytm|Netflix|Prime|YouTube|Google|Microsoft)/i, extract: (m) => m[0] },
];

/**
 * Extract amount from SMS body - returns the largest valid amount found
 */
function extractAmount(body: string): number | null {
    let maxAmount: number | null = null;

    for (const pattern of AMOUNT_PATTERNS) {
        let match;
        const regexWithGlobal = new RegExp(pattern.source, pattern.flags);
        while ((match = regexWithGlobal.exec(body)) !== null) {
            if (match[1]) {
                const cleaned = match[1].replace(/,/g, '');
                const amount = parseFloat(cleaned);
                // Valid range: 1 to 10 million
                if (!isNaN(amount) && amount > 0 && amount < 10000000) {
                    if (maxAmount === null || amount > maxAmount) {
                        maxAmount = amount;
                    }
                }
            }
        }
    }

    return maxAmount;
}

/**
 * Determine if the transaction is debit or credit
 */
function determineType(body: string): 'debit' | 'credit' {
    const lower = body.toLowerCase();
    const debitScore = DEBIT_KEYWORDS.filter(k => lower.includes(k)).length;
    const creditScore = CREDIT_KEYWORDS.filter(k => lower.includes(k)).length;
    return creditScore > debitScore ? 'credit' : 'debit';
}

/**
 * Extract merchant/description from SMS
 */
function extractDescription(body: string): string {
    // Try merchant patterns first
    for (const { pattern, extract } of MERCHANT_PATTERNS) {
        const match = body.match(pattern);
        if (match) {
            const merchant = extract(match).trim().substring(0, 40);
            if (merchant && merchant.length > 2) {
                return merchant;
            }
        }
    }

    // Fallback: extract first meaningful text
    const words = body.split(/\s+/).filter(w => w.length > 2 && !/^[0-9x.,₹Rs-]+$/.test(w));
    if (words.length > 0) {
        return words.slice(0, 3).join(' ').substring(0, 40);
    }

    return 'Bank Transaction';
}

/**
 * Detect account/payment type
 */
function detectAccountType(body: string): string {
    for (const { pattern, type } of ACCOUNT_TYPE_PATTERNS) {
        if (pattern.test(body)) {
            return type;
        }
    }
    return 'Bank';
}

/**
 * Check if an SMS body looks like a bank transaction message
 */
export function isBankSMS(body: string): boolean {
    const lower = body.toLowerCase();
    const hasAmount = AMOUNT_PATTERNS.some(p => p.test(body));
    const hasBankKeywords = [
        'debited', 'credited', 'a/c', 'account', 'bank',
        'txn', 'transaction', 'upi', 'neft', 'rtgs', 'imps', 'card',
        'withdrawn', 'balance', 'atm', 'paid', 'transfer',
        'google pay', 'phonepe', 'paytm', 'bhim', 'received'
    ].some(k => lower.includes(k));

    return hasAmount && hasBankKeywords;
}

/**
 * Parse a single SMS body into a structured transaction
 */
export function parseSMS(body: string, id?: string): ParsedSMS | null {
    if (!isBankSMS(body)) {
        return null;
    }

    const amount = extractAmount(body);
    if (!amount) {
        return null;
    }

    const description = extractDescription(body);
    const accountType = detectAccountType(body);

    return {
        id: id || crypto.randomUUID(),
        amount,
        description,
        type: determineType(body),
        date: new Date(),
        accountType,
        merchantName: description,
        originalBody: body,
    };
}

/**
 * Parse multiple SMS messages and return only valid transactions
 */
export function parseMultipleSMS(messages: { body: string; date?: Date }[]): ParsedSMS[] {
    return messages
        .map((msg, i) => {
            const parsed = parseSMS(msg.body, `sms-${Date.now()}-${i}`);
            if (parsed && msg.date) {
                parsed.date = msg.date;
            }
            return parsed;
        })
        .filter((p): p is ParsedSMS => p !== null);
}
