import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { Brewery, BreweryTimeline } from 'src/app/core/interfaces';
import { Timestamp } from '@firebase/firestore-types';
import { RequireMatch } from 'src/app/core/validators';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-timeline-dialog',
  templateUrl: './timeline-dialog.component.html',
  styleUrls: ['./timeline-dialog.component.scss'],
  standalone: true,
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' }
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ]
})

export class TimelineDialogComponent implements OnInit {
  filtered?: Observable<Brewery[]>;
  form = new FormGroup({
    start: new FormControl('', [Validators.required]),
    startTime: new FormControl('', [Validators.required]),
    end: new FormControl('', [Validators.required]),
    endTime: new FormControl('', [Validators.required])
  } as any); // Allow dynamic addition of controls
  defaultTimeStart: string = dayjs().format('HH:mm').toString();
  defaultTimeEnd = this.defaultTimeStart;

  public data = inject(MAT_DIALOG_DATA) as { timeline: BreweryTimeline, brewery: Brewery, breweries: Brewery[] };
  private dialogRef = inject(MatDialogRef<TimelineDialogComponent>);

  get dialogTitle(): string {
    if (this.data.timeline) {
      return 'Edit Timeline Entry';
    }
    return this.data.breweries ? 'Add Timeline Entry' : `Add to ${this.data.brewery?.name}`;
  }

  get dialogSubtitle(): string {
    if (this.data.timeline) {
      return 'Modify brewery visit details';
    }
    return 'Record your brewery visit';
  }

  ngOnInit() {
    if (this.data.breweries) {
      this.form.addControl('brewery', new FormControl('', [Validators.required, RequireMatch]));
      if (this.data.brewery) this.form.get('brewery')?.patchValue(this.data.brewery);
    }
    if (this.data.timeline) {
      const startDate = this.data.timeline.start as Timestamp;
      const endDate = this.data.timeline.end as Timestamp;

      let data: any = {};
      if (startDate) {
        const start = dayjs(startDate.toDate());
        this.defaultTimeStart = start.format('HH:mm').toString();
        data.start = start.toDate();
        data.startTime = this.defaultTimeStart;
      }

      if (endDate) {
        const end = dayjs(endDate.toDate());
        this.defaultTimeEnd = end.format('HH:mm').toString();
        data.end = end.toDate();
        data.endTime = this.defaultTimeEnd;
      }
      this.form.patchValue(data);
    } else {
      this.filtered = this.form.get('brewery')?.valueChanges.pipe(startWith(''), map(value => this.filter(value as string | Brewery)));
    }
  }

  displayFn(brewery: Brewery): string {
    return brewery && brewery.name ? brewery.name : '';
  }

  save() {
    if (!this.form.valid) return;
    this.dialogRef.close(this.form.value);
  }

  cancel() {
    this.dialogRef.close();
  }

  onStartChange() {
    this.form.controls['end']?.patchValue(this.form.value.start || null);
  }

  private filter(value: string | Brewery): Brewery[] {
    if (!value || typeof value === 'object') return [];
    const filterValue = value.toLowerCase();
    return this.data.breweries.filter(option => option.name.toLowerCase().includes(filterValue));
  }
}
