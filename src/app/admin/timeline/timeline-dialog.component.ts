import { Component, Inject, OnInit } from '@angular/core';
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
  });
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
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { timeline: BreweryTimeline, brewery: Brewery, breweries: Brewery[] },
    private dialogRef: MatDialogRef<TimelineDialogComponent>) { }

  ngOnInit() {
    if (this.data.breweries) {
      this.form.addControl('brewery', new FormControl('', [Validators.required, RequireMatch]));
      if (this.data.brewery) this.form.controls['brewery'].patchValue(this.data.brewery);
    }
    if (this.data.timeline) {
      const start = dayjs((this.data.timeline.start as Timestamp).toDate());
      const end = dayjs((this.data.timeline.end as Timestamp).toDate());
      this.defaultTimeEnd = end.format('hh:mm a').toString();
      this.defaultTimeStart = start.format('hh:mm a').toString();
      this.form.patchValue({
        start: start.toDate(),
        startTime: this.defaultTimeStart,
        end: end.toDate(),
        endTime: this.defaultTimeEnd
      })
    } else {
      this.filtered = this.form.controls.brewery.valueChanges.pipe(startWith(''), map(value => this.filter(value)));
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
    this.form.controls.end.patchValue(this.form.value.start);
  }

  private filter(value: string | Brewery): Brewery[] {
    if (!value || typeof value === 'object') return [];
    const filterValue = value.toLowerCase();
    return this.data.breweries.filter(option => option.name.toLowerCase().includes(filterValue));
  }
}
