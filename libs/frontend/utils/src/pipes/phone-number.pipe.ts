import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneNumber',
  standalone: true
})
export class PhoneNumberPipe implements PipeTransform {
  transform(value: string | null): string {
    if (!value) return '';

    // Remove any non-digit characters except +
    const cleaned = value.replace(/[^\d+]/g, '');

    // Extract the digits we need
    let digits = cleaned;
    
    // Handle different formats
    if (cleaned.startsWith('+32')) {
      digits = cleaned.substring(3); // Remove +32
    } else if (cleaned.startsWith('32')) {
      digits = cleaned.substring(2); // Remove 32
    } else if (cleaned.startsWith('0')) {
      digits = cleaned.substring(1); // Remove leading 0
    }

    // If we have 9 digits (Belgian format), format it properly
    if (digits.length === 9) {
      const groups = [
        digits.substr(0, 3),  // First 3 digits
        digits.substr(3, 2),  // Next 2
        digits.substr(5, 2),  // Next 2
        digits.substr(7, 2)   // Last 2
      ];
      return `+32 ${groups.join(' ')}`;
    }

    // If no format matches, just clean it up and return
    if (cleaned.startsWith('32')) {
      return '+' + cleaned.replace(/(\d{2})(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return cleaned;

    // If no format matches, return the cleaned number
    return cleaned;
  }
}
