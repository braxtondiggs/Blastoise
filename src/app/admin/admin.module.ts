import { NgModule } from '@angular/core';
import { SharedModule } from '../core/shared.module';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth/auth-dialog.component';
@NgModule({
  declarations: [AdminComponent, AuthDialogComponent],
  imports: [
    AdminRoutingModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    SharedModule
  ]
})
export class AdminModule { }
