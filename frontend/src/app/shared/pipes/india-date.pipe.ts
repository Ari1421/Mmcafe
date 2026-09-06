import { Pipe, PipeTransform } from '@angular/core';

/** Formats an ISO date string / Date as DD-MM-YYYY, per the India date format requirement. */
@Pipe({ name: 'indiaDate', standalone: true })
export class IndiaDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}
