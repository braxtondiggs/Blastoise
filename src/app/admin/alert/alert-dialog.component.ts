import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-alert-dialog',
  templateUrl: './alert-dialog.component.html',
  styles: [`h2 img { height:50px }`],
})

export class AlertDialogComponent {
  public data = inject(MAT_DIALOG_DATA) as { msg: string };
}
