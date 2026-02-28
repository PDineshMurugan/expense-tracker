import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MerchantAliasService {

    private aliases: Record<string, string> = {
        'swiggy': 'Swiggy',
        'zomato': 'Zomato',
        'amazon': 'Amazon',
        'flipkart': 'Flipkart',
        'uber': 'Uber',
        'ola': 'Ola',
        'blinkit': 'Blinkit',
        'zepto': 'Zepto',
        'dmart': 'DMart',
        'jio': 'Jio',
        'airtel': 'Airtel',
        'makemytrip': 'MakeMyTrip',
        'irctc': 'IRCTC',
        'netflix': 'Netflix',
        'prime': 'Amazon Prime',
        'spotify': 'Spotify',
        'myntra': 'Myntra',
        'nykaa': 'Nykaa',
        'bigbasket': 'BigBasket',
        'bookmyshow': 'BookMyShow',
        'starbucks': 'Starbucks'
    };

    applyAlias(merchantRaw: string): string {
        if (!merchantRaw) return merchantRaw;

        // Remove common UPI/VPA suffixes
        const cleaned = merchantRaw.replace(/\*?UPI[-/]?/i, '')
            .replace(/\*?VPA[-/]?/i, '')
            .replace(/-T$/i, '')
            .replace(/@\w+$/i, '') // e.g. @okhdfcbank
            .trim();

        const lower = cleaned.toLowerCase();

        // Check against alias dictionary
        for (const [key, alias] of Object.entries(this.aliases)) {
            if (lower.includes(key)) {
                return alias;
            }
        }

        // Capitalize first letter of each word if no alias found
        return cleaned.replace(/\b\w/g, c => c.toUpperCase());
    }

}
