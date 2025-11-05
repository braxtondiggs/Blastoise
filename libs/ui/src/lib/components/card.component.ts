import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Card Component with ARIA accessibility
 */
@Component({
  selector: 'lib-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="cardClasses"
      role="article"
      [attr.aria-labelledby]="title ? 'card-title-' + cardId : null"
    >
      <figure *ngIf="imageSrc" class="px-4 pt-4">
        <img
          [src]="imageSrc"
          [alt]="imageAlt"
          class="rounded-xl"
          [attr.aria-hidden]="!imageAlt"
        />
      </figure>
      <div class="card-body">
        <h2
          *ngIf="title"
          [id]="'card-title-' + cardId"
          class="card-title"
        >
          {{ title }}
        </h2>
        <ng-content></ng-content>
        <div *ngIf="hasActions" class="card-actions justify-end">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CardComponent {
  @Input() title?: string;
  @Input() imageSrc?: string;
  @Input() imageAlt = '';
  @Input() variant: 'normal' | 'compact' | 'side' = 'normal';
  @Input() hasActions = false;

  // Generate unique ID for ARIA labelledby
  cardId = Math.random().toString(36).substring(2, 9);

  get cardClasses(): string {
    const classes = ['card', 'bg-base-100', 'shadow-xl'];
    if (this.variant === 'compact') classes.push('card-compact');
    if (this.variant === 'side') classes.push('card-side');
    return classes.join(' ');
  }
}
