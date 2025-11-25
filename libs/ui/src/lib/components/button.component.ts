import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Button Component with ARIA accessibility
 */
@Component({
  selector: 'lib-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="buttonClasses"
      [attr.aria-label]="ariaLabel"
      [attr.aria-pressed]="ariaPressed"
      [attr.aria-disabled]="disabled"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: []
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'accent' | 'ghost' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() ariaLabel?: string;
  @Input() ariaPressed?: boolean;

  get buttonClasses(): string {
    return `btn btn-${this.variant} btn-${this.size}`;
  }
}
