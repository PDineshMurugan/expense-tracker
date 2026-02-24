import { Injectable } from '@angular/core';
import { BANK_SENDERS } from './bank_senders';



export const PROMO_SENDERS = [
    'ADVT', 'PROMO', 'OFFER', 'SALE', 'ALERTS', 'UPDATE', 'NEWS', 'INFO'
];

@Injectable({ providedIn: 'root' })
export class BankMappingService {

    /**
     * Identifies the bank from a cleaned sender ID and whether it's a promotional sender.
     */
    getSenderInfo(cleanSender: string): { bankName: string | null, isPromotional: boolean } {
        const isPromo = PROMO_SENDERS.includes(cleanSender) || /^\d+$/.test(cleanSender); // Shortcodes are often promo/spam
        const bankName = BANK_SENDERS[cleanSender] || null;

        return { bankName, isPromotional: isPromo };
    }

}
