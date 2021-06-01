import { NgModule } from '@angular/core';
import { SharedModule } from '../core/shared.module';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth/auth-dialog.component';
import { MatBadgeModule } from '@angular/material/badge';
import { ReviewsDialogComponent } from './reviews/reviews-dialog.component';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AlertDialogComponent } from './alert/alert-dialog.component';
import { HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@NgModule({
  declarations: [AdminComponent, AuthDialogComponent, ReviewsDialogComponent, AlertDialogComponent],
  imports: [
    AdminRoutingModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatBadgeModule,
    MatListModule,
    MatSnackBarModule,
    HttpClientModule,
    MatProgressSpinnerModule,
    SharedModule
  ]
})
export class AdminModule { }
