import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: string;
}

@Component({
  selector: 'lib-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ul class="timeline timeline-vertical">
      <li *ngFor="let item of items; let i = index">
        <div class="timeline-start">{{ item.timestamp }}</div>
        <div class="timeline-middle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-5 w-5"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="timeline-end timeline-box">
          <h4 class="font-bold">{{ item.title }}</h4>
          <p *ngIf="item.description">{{ item.description }}</p>
        </div>
        <hr *ngIf="i < items.length - 1" />
      </li>
    </ul>
  `,
  styles: []
})
export class TimelineComponent {
  @Input() items: TimelineItem[] = [];
}
