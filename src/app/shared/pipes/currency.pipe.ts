import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currency', standalone: true })
export class CurrencyPipe implements PipeTransform {
    transform(value: number | string | null | undefined, symbol = '₹'): string {
        if (value === null || value === undefined || value === '') return `${symbol}0`;
        const val = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
        if (isNaN(val)) return `${symbol}0`;
        return `${symbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
}
