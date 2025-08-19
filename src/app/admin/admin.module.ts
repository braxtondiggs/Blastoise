import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Angular Material Modules
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Third-party modules
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';

// Local modules and components
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { AddActionsBottomSheetComponent } from './add-actions/add-actions-bottom-sheet.component';
import { AlertDialogComponent } from './alert/alert-dialog.component';
import { AuthDialogComponent } from './auth/auth-dialog.component';
import { BreweryDialogComponent } from './brewery/brewery-dialog.component';
import { ReviewsDialogComponent } from './reviews/reviews-dialog.component';
import { TimelineDialogComponent } from './timeline/timeline-dialog.component';

@NgModule({
  declarations: [
    AdminComponent,
    AddActionsBottomSheetComponent,
    AlertDialogComponent,
    AuthDialogComponent,
    BreweryDialogComponent,
    ReviewsDialogComponent,
    TimelineDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    AdminRoutingModule,

    // Angular Material Modules
    MatAutocompleteModule,
    MatBadgeModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,

    // Third-party modules
    NgxMaterialTimepickerModule
  ]
})
export class AdminModule { }
