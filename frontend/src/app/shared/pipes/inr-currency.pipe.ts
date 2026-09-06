import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as Indian currency: ₹1,25,450.00 (lakh/crore grouping),
 * per the "Display Indian currency format" requirement. Native Intl with
 * the en-IN locale already produces the correct digit grouping.
 */
@Pipe({ name: 'inrCurrency', standalone: true })
export class InrCurrencyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return '₹0.00';
    return this.formatter.format(value);
  }
}
