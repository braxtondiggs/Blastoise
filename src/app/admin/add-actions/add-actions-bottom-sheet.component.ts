import { Component, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

export interface AddActionResult {
  action: 'timeline' | 'brewery';
}

@Component({
  selector: 'app-add-actions-bottom-sheet',
  template: `
    <mat-list>
      <h3 mat-subheader>Quick Actions</h3>
      <mat-list-item (click)="selectAction('timeline')" button>
        <mat-icon matListItemIcon>timeline</mat-icon>
        <span matListItemTitle>Add Visit to Timeline</span>
        <span matListItemLine class="mat-caption">Record a new brewery visit</span>
      </mat-list-item>
      <mat-list-item (click)="selectAction('brewery')" button>
        <mat-icon matListItemIcon>local_bar</mat-icon>
        <span matListItemTitle>Add New Brewery</span>
        <span matListItemLine class="mat-caption">Create a new brewery entry</span>
      </mat-list-item>
    </mat-list>
  `,
  styles: [`
    mat-list {
      padding: 16px 0;
      min-width: 280px;
      max-width: 100vw;
      width: 100%;
      box-sizing: border-box;
    }

    h3[mat-subheader] {
      margin: 0 16px 8px 16px;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
    }

    mat-list-item {
      cursor: pointer;
      margin-bottom: 4px;
      min-height: 64px;
      padding: 0 16px;
    }

    mat-list-item:last-child {
      margin-bottom: 0;
    }

    .mat-caption {
      font-size: 12px;
      margin-top: 2px;
    }

    mat-icon[matListItemIcon] {
      color: var(--mdc-theme-primary, #1976d2);
      margin-right: 16px;
    }

    [matListItemTitle] {
      font-weight: 500;
    }

    [matListItemLine] {
      margin-top: 4px;
    }

    /* Mobile responsive styles */
    @media (max-width: 768px) {
      :host ::ng-deep mat-list {
        min-width: 100%;
        padding: 12px 0;
      }

      :host ::ng-deep mat-list-item {
        padding: 0 12px;
        min-height: 56px;
      }

      :host ::ng-deep h3[mat-subheader] {
        margin: 0 12px 8px 12px;
      }
    }
  `]
})
export class AddActionsBottomSheetComponent {
  private bottomSheetRef = inject(MatBottomSheetRef<AddActionsBottomSheetComponent>);

  selectAction(action: 'timeline' | 'brewery'): void {
    this.bottomSheetRef.dismiss({ action } as AddActionResult);
  }
}
