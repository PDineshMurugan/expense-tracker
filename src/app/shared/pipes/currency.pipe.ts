import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currency', standalone: true })
export class CurrencyPipe implements PipeTransform {
    transform(value: number | null | undefined, symbol = '₹'): string {
        if (value === null || value === undefined) return `${symbol}0`;
        return `${symbol}${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
}
