import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * T243: Modal Component with ARIA accessibility
 */
@Component({
  selector: 'lib-app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <input
      type="checkbox"
      [id]="modalId"
      class="modal-toggle"
      [checked]="isOpen"
      [attr.aria-hidden]="true"
    />
    <div
      class="modal"
      role="dialog"
      [attr.aria-modal]="true"
      [attr.aria-labelledby]="title ? modalId + '-title' : null"
      [attr.aria-describedby]="modalId + '-content'"
    >
      <div [class]="modalBoxClasses">
        <h3 *ngIf="title" [id]="modalId + '-title'" class="font-bold text-lg">
          {{ title }}
        </h3>
        <div [id]="modalId + '-content'" class="py-4">
          <ng-content></ng-content>
        </div>
        <div class="modal-action">
          <button
            type="button"
            class="btn"
            (click)="onClose()"
            (keydown.enter)="onClose()"
            (keydown.space)="$event.preventDefault(); onClose()"
            aria-label="Close modal"
          >
            Close
          </button>
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ModalComponent {
  @Input() modalId = 'modal';
  @Input() title?: string;
  @Input() isOpen = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() closed = new EventEmitter<void>();

  get modalBoxClasses(): string {
    const classes = ['modal-box'];
    if (this.size === 'sm') classes.push('max-w-sm');
    if (this.size === 'lg') classes.push('max-w-5xl');
    return classes.join(' ');
  }

  onClose() {
    this.closed.emit();
  }
}
