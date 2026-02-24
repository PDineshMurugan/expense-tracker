import { Injectable } from '@angular/core';
import { ParsedSMS } from './models/parsed-sms.model';
import { BankMappingService } from './bank-mapping.service';
import { MerchantAliasService } from './merchant-alias.service';
import {
    cleanSender, extractAmount, extractMerchant, extractBalance, extractAccount,
    extractUPI, extractDate, detectType, detectStatus, detectIsTransfer,
    hasTransactionKeywords, isPromotional, LOAN_IGNORE_WORDS, detectAccountType
} from '../utils/sms-parser.util';

export interface SMSPattern {
    id: string;
    bank: string;
    version: number;
    regex: RegExp;
    confidence: number;
    parse(match: RegExpMatchArray): Partial<ParsedSMS>;
}

@Injectable({ providedIn: 'root' })
export class SmsParserService {
    private patterns: SMSPattern[] = [];

    constructor(
        private bankMappingService: BankMappingService,
        private merchantAliasService: MerchantAliasService
    ) {
        this.registerPatterns();
    }

    private registerPatterns() {
        // Example: HDFC Bank generic regex
        this.patterns.push({
            id: 'hdfc-1',
            bank: 'HDFC Bank',
            version: 1,
            regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been debited|is debited|debited).*(?:A\/c no\.|A\/c).*?(\d+).*(?:Info|to|at)\s+(?:\w+\*+)?([a-zA-Z0-9\s.]+)/i,
            confidence: 0.9,
            parse: (match) => ({
                amount: parseFloat(match[1].replace(/,/g, '')),
                accountIdentifier: match[2],
                merchantName: match[3]?.trim(),
                type: 'debit',
                status: 'success'
            })
        });

        // Example: UPI Generic (SBI/ICICI/others)
        this.patterns.push({
            id: 'upi-generic',
            bank: 'Generic Pattern',
            version: 1,
            regex: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been)?\s*(?:debited|deducted).*?(?:account|a\/c).*?(\d+).*?(?:to|for)\s+(?:VPA|UPI|merchant)?\s*([a-zA-Z0-9@.-]+)/i,
            confidence: 0.8,
            parse: (match) => ({
                amount: parseFloat(match[1].replace(/,/g, '')),
                accountIdentifier: match[2],
                merchantName: match[3]?.trim(),
                type: 'debit',
                status: 'success'
            })
        });
    }

    private normalizeText(sms: string): string {
        return sms.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    processSMS(rawSms: string, sender?: string, id?: string): ParsedSMS | null {
        // --- 1. Basic Filtering ---
        if (!hasTransactionKeywords(rawSms)) return null;

        const lBody = rawSms.toLowerCase();
        if (LOAN_IGNORE_WORDS.some(w => lBody.includes(w))) {
            return null; // Ignore loan/promotional eligibility messages
        }

        const normalized = this.normalizeText(rawSms);

        // --- 2. Sender Normalization & Promo Filtering ---
        const { name: cleanedSenderName } = cleanSender(sender);
        const { bankName, isPromotional: isPromoSender } = this.bankMappingService.getSenderInfo(cleanedSenderName);

        // Active Promo Check: If marked as promo OR contains promo words and lacks transaction amount/details
        if (isPromoSender || isPromotional(normalized)) {
            // Need a strong reason to keep it
            const _amt = extractAmount(normalized);
            // If it's a promotional message that just happens to have "debited/credited" but doesn't actually have an amount, drop it.
            // Often "offers" don't include an actual amount debited from your account.
            if (!_amt) return null;
        }

        // --- 3. Pipeline Attempt 1: Pattern Registry ---
        let parsedData: Partial<ParsedSMS> | null = null;
        let baseConfidence = 0;
        let identifiedBank = bankName;

        for (const pattern of this.patterns) {
            const match = normalized.match(pattern.regex);
            if (match) {
                parsedData = pattern.parse(match);
                baseConfidence = pattern.confidence;
                if (!identifiedBank) {
                    identifiedBank = pattern.bank !== 'Generic Pattern' ? pattern.bank : 'Unknown';
                }
                break; // Use the first matching pattern
            }
        }

        // --- 4. Pipeline Attempt 2: Generic Heuristics (Fallback) ---
        if (!parsedData) {
            const amount = extractAmount(normalized);
            if (!amount) return null; // Amount is absolutely required for heuristics

            const merchant = extractMerchant(normalized, cleanedSenderName);
            parsedData = {
                amount,
                merchantName: merchant,
                type: detectType(normalized),
                status: detectStatus(normalized),
                accountIdentifier: extractAccount(normalized),
            };

            // Calculate confidence dynamically based on extracted fields
            baseConfidence = 0.4; // Base score for finding an amount and transaction keyword
            if (amount) baseConfidence += 0.3;
            if (merchant) baseConfidence += 0.2;
            baseConfidence = Math.min(baseConfidence, 1);
        }

        // --- 5. Enrichment (Apply to both Pattern & Generic paths) ---

        // Add fields that the pattern might have missed, using the generic extractors as a backfill
        if (!parsedData.type) parsedData.type = detectType(normalized);
        if (!parsedData.status) parsedData.status = detectStatus(normalized);
        if (!parsedData.accountIdentifier) parsedData.accountIdentifier = extractAccount(normalized);

        // Always run these as they are usually not covered by basic regex patterns
        const balance = extractBalance(normalized);
        const upi = extractUPI(normalized);
        const date = extractDate(normalized) ?? new Date();
        const isTransfer = detectIsTransfer(normalized);

        // Alias cleanup
        const cleanMerchant = this.merchantAliasService.applyAlias(parsedData.merchantName || '');

        // Generate ID
        const finalId = id || `sms-${Date.now()}-${Math.random()}`;

        // Assemble canonical return model
        return {
            id: finalId,
            smsId: finalId,
            amount: parsedData.amount!,
            description: cleanMerchant || 'Bank Transaction',
            merchantName: cleanMerchant || 'Unknown Merchant',

            type: parsedData.type as any,
            status: parsedData.status as any,
            date,

            accountType: detectAccountType(normalized),
            accountIdentifier: parsedData.accountIdentifier,
            availableBalance: balance,

            upiId: upi.upiId,
            upiRef: upi.upiRef,

            sender: cleanedSenderName,
            bank: identifiedBank || 'Unknown',
            bankConfidence: identifiedBank === bankName ? 0.9 : (identifiedBank !== 'Unknown' ? baseConfidence : 0.4),
            confidence: baseConfidence,
            isTransfer,

            originalBody: rawSms
        };
    }

    parseMultipleSMS(
        messages: { body: string; date?: Date; sender?: string }[]
    ): ParsedSMS[] {
        const seen = new Set<string>();

        return messages
            .map((m, i) => {
                // Create a deterministic hash/id for deduplication
                const deterministicId = m.date
                    ? `sms-${m.date.getTime()}-${m.body.substring(0, 20).replace(/\s/g, '')}`
                    : `sms-${Date.now()}-${i}`;

                const parsed = this.processSMS(
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
}
