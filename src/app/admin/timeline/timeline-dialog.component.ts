import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Brewery, BreweryTimeline } from 'src/app/core/interfaces';
import { Timestamp } from '@firebase/firestore-types';
import { NgxMaterialTimepickerTheme } from 'ngx-material-timepicker';
import { RequireMatch } from 'src/app/core/validators';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import * as dayjs from 'dayjs';
@Component({
  selector: 'app-timeline-dialog',
  templateUrl: './timeline-dialog.component.html',
  styles: [`h2 img { height:50px } caption { font-size: 12px; line-height: 14px; } h3 { font-size: 16px; margin: 0; line-height: 18px; }`],
})

export class TimelineDialogComponent implements OnInit {
  filtered?: Observable<Brewery[]>;
  form = new FormGroup({
    start: new FormControl('', [Validators.required]),
    startTime: new FormControl('', [Validators.required]),
    end: new FormControl('', [Validators.required]),
    endTime: new FormControl('', [Validators.required])
  } as any); // Allow dynamic addition of controls
  defaultTimeStart: string = dayjs().format('hh:mm A').toString();
  defaultTimeEnd = this.defaultTimeStart;
  theme: NgxMaterialTimepickerTheme = {
    container: {
      bodyBackgroundColor: '#303030',
      buttonColor: '#69f0ae'
    },
    dial: {
      dialBackgroundColor: '#7b1fa2',
    },
    clockFace: {
      clockFaceBackgroundColor: '#424242',
      clockHandColor: '#7b1fa2',
      clockFaceTimeInactiveColor: '#fff'
    }
  };

  public data = inject(MAT_DIALOG_DATA) as { timeline: BreweryTimeline, brewery: Brewery, breweries: Brewery[] };
  private dialogRef = inject(MatDialogRef<TimelineDialogComponent>);

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
        this.defaultTimeStart = start.format('hh:mm a').toString();
        data.start = start.toDate();
        data.startTime = this.defaultTimeStart;
      }

      if (endDate) {
        const end = dayjs(endDate.toDate());
        this.defaultTimeEnd = end.format('hh:mm a').toString();
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

  onStartChange() {
    this.form.controls['end']?.patchValue(this.form.value.start || null);
  }

  private filter(value: string | Brewery): Brewery[] {
    if (!value || typeof value === 'object') return [];
    const filterValue = value.toLowerCase();
    return this.data.breweries.filter(option => option.name.toLowerCase().includes(filterValue));
  }
}
