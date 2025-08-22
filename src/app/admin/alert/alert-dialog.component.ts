import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-alert-dialog',
  templateUrl: './alert-dialog.component.html',
  styleUrls: ['./alert-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule]
})

export class AlertDialogComponent {
  public data = inject(MAT_DIALOG_DATA) as { msg: string; title?: string; type?: 'info' | 'warning' | 'error' | 'success' };
  private dialogRef = inject(MatDialogRef<AlertDialogComponent>);

  get alertIcon(): string {
    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'check_circle';
      default:
        return 'info';
    }
  }

  get alertTitle(): string {
    return this.data.title || 'Braxton\'s Beer Alert';
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
