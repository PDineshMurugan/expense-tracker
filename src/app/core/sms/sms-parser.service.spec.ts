import { describe, it, expect, beforeEach } from 'vitest';
import { SmsParserService } from './sms-parser.service';
import { BankMappingService } from './bank-mapping.service';
import { MerchantAliasService } from './merchant-alias.service';

describe('SmsParserService', () => {
    let service: SmsParserService;
    let bankMappingService: BankMappingService;
    let merchantAliasService: MerchantAliasService;

    beforeEach(() => {
        bankMappingService = new BankMappingService();
        merchantAliasService = new MerchantAliasService();
        service = new SmsParserService(bankMappingService, merchantAliasService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Promotional Filtering', () => {
        it('should ignore promotional messages with amounts', () => {
            const result = service.processSMS('Get a gaming laptop at just Rs.52990! Limited offer.', 'VM-ADVT-T');
            expect(result).toBeNull();
        });

        it('should ignore promotional messages from known banks', () => {
            // High confidence sender, strong promo keyword, amount but no txn keyword
            const result = service.processSMS('Big Diwali Sale! iPhone starting at Rs. 50000. Apply now.', 'VM-HDFCBK-T');
            expect(result).toBeNull();
        });

        it('should ignore loan messages', () => {
            const result = service.processSMS('You are eligible for a pre-approved loan of Rs. 100000. Click here.', 'VM-HDFCBK-T');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Registry Matching', () => {
        it('should match exact HDFC pattern and extract data', () => {
            const sample = 'Rs.500.00 has been debited from A/c no. 1234 to Amazon on 23-04-2023. Info: Txn123.';
            const result = service.processSMS(sample, 'VM-HDFCBK-T');

            expect(result).toBeTruthy();
            expect(result?.amount).toBe(500);
            expect(result?.accountIdentifier).toBe('1234');
            expect(result?.merchantName).toBe('Amazon');
            expect(result?.bank).toBe('HDFC Bank');
            expect(result?.bankConfidence).toBe(0.9);
            expect(result?.confidence).toBe(0.9);
        });

        it('should fallback to Generic Pattern if HDFC pattern fails but UPI format matches', () => {
            const sample = 'Rs 150.00 debited from a/c 5678 to VPA swiggy@upi for food.';
            const result = service.processSMS(sample, 'VM-SBIN-T');

            expect(result).toBeTruthy();
            expect(result?.amount).toBe(150);
            expect(result?.accountIdentifier).toBe('5678');
            expect(result?.merchantName).toBe('Swiggy');
            expect(result?.bank).toBe('State Bank of India'); // from mapping
            expect(result?.bankConfidence).toBe(0.9);
        });
    });

    describe('Heuristic Fallback', () => {
        it('should parse unstructured transaction messages', () => {
            const sample = 'Paid Rs 1,450 to Jio Prepaid via UPI.';
            const result = service.processSMS(sample, 'VM-AXISBK-T');

            expect(result).toBeTruthy();
            expect(result?.amount).toBe(1450);
            expect(result?.merchantName).toBe('Jio Prepaid');
            expect(result?.bank).toBe('Axis Bank');
            expect(result?.bankConfidence).toBe(0.9);
            expect(result?.type).toBe('debit');
        });

        it('should handle missing sender info gracefully', () => {
            const sample = 'Credited INR 5000 to a/c ending 1111 towards Salary.';
            const result = service.processSMS(sample); // No sender ID

            expect(result).toBeTruthy();
            expect(result?.amount).toBe(5000);
            expect(result?.type).toBe('credit');
            expect(result?.bank).toBe('Unknown');
            expect(result?.bankConfidence).toBeLessThan(0.9);
        });
    });

    describe('Multiple SMS Parsing', () => {
        it('should deduplicate messages based on content hash', () => {
            const messages = [
                { body: 'Rs 100 spent at Amazon', date: new Date('2023-01-01'), sender: 'HDFCBK' },
                { body: 'Rs 100 spent at Amazon', date: new Date('2023-01-01'), sender: 'HDFCBK' }, // Duplicate
                { body: 'Rs 200 spent at Flipkart', date: new Date('2023-01-01'), sender: 'HDFCBK' }
            ];

            const results = service.parseMultipleSMS(messages);
            expect(results.length).toBe(2);
            expect(results[0].amount).toBe(100);
            expect(results[1].amount).toBe(200);
        });
    });

});
