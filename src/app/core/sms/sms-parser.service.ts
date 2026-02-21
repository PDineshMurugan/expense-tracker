import { Injectable } from '@angular/core';

export interface ParsedSMS {
    amount: number;
    merchant?: string;
    account?: string;
    confidence: number;
    parserVersion: number;
}

export interface SMSPattern {
    id: string;
    bank: string;
    version: number;
    regex: RegExp;
    confidence: number;
    parse(match: RegExpMatchArray): ParsedSMS;
}

@Injectable({ providedIn: 'root' })
export class SmsParserService {
    private patterns: SMSPattern[] = [];

    constructor() {
        this.registerPatterns();
    }

    private registerPatterns() {
        // Example: HDFC Bank generic regex
        this.patterns.push({
            id: 'hdfc-1',
            bank: 'HDFC',
            version: 1,
            regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been debited|is debited|debited).*(?:A\/c no\.|A\/c).*?(\d+).*(?:Info|to|at)\s+(?:\w+\*+)?([a-zA-Z0-9\s.]+)/i,
            confidence: 0.9,
            parse: (match) => ({
                amount: parseFloat(match[1].replace(/,/g, '')),
                account: match[2],
                merchant: match[3]?.trim(),
                confidence: 0.9,
                parserVersion: 1
            })
        });

        // Example: UPI Generic (SBI/ICICI/others)
        this.patterns.push({
            id: 'upi-generic',
            bank: 'GENERIC_UPI',
            version: 1,
            regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been)?\s*(?:debited|deducted).*?(?:account|a\/c).*?(\d+).*?(?:to|for)\s+(?:VPA|UPI|merchant)?\s*([a-zA-Z0-9@.-]+)/i,
            confidence: 0.8,
            parse: (match) => ({
                amount: parseFloat(match[1].replace(/,/g, '')),
                account: match[2],
                merchant: match[3]?.trim(),
                confidence: 0.8,
                parserVersion: 1
            })
        });
    }

    private normalizeText(sms: string): string {
        return sms.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    processSMS(rawSms: string): ParsedSMS | null {
        const normalized = this.normalizeText(rawSms);
        const matches: ParsedSMS[] = [];

        // Run all patterns
        for (const pattern of this.patterns) {
            const match = normalized.match(pattern.regex);
            if (match) {
                matches.push(pattern.parse(match));
            }
        }

        if (matches.length === 0) return null;

        // Choose highest confidence
        matches.sort((a, b) => b.confidence - a.confidence);
        const bestMatch = matches[0];

        // Apply merchant alias mapping (mock logic, ideally calls MerchantAlias service)
        bestMatch.merchant = this.applyAlias(bestMatch.merchant || 'Unknown');

        // Confidence gate check handled by caller: if (bestMatch.confidence < 0.6) prompt user
        return bestMatch;
    }

    private applyAlias(merchantRaw: string): string {
        // E.g., 'SWIGGY*UPI' -> 'Swiggy'
        // This should interact with DB/Store `merchantAliases` in a real scenario
        const lower = merchantRaw.toLowerCase();
        if (lower.includes('swiggy')) return 'Swiggy';
        if (lower.includes('zomato')) return 'Zomato';
        if (lower.includes('amazon')) return 'Amazon';
        if (lower.includes('flipkart')) return 'Flipkart';

        // Clean up UPI prefixes
        return merchantRaw.replace(/UPI[-/]/i, '').replace(/VPA[-/]/i, '').trim();
    }
}
