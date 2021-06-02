import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Brewery, BreweryTimeline } from 'src/app/core/interfaces';
import { Timestamp } from '@firebase/firestore-types';
import { NgxMaterialTimepickerTheme } from 'ngx-material-timepicker';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-timeline-dialog',
  templateUrl: './timeline-dialog.component.html',
  styles: [`h2 img { height:50px }`],
})

export class TimelineDialogComponent implements OnInit {
  form = new FormGroup({
    start: new FormControl('', [Validators.required]),
    startTime: new FormControl('', [Validators.required]),
    end: new FormControl('', [Validators.required]),
    endTime: new FormControl('', [Validators.required])
  });

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
    @Inject(MAT_DIALOG_DATA) public data: { timeline: BreweryTimeline, brewery: Brewery },
    private dialogRef: MatDialogRef<TimelineDialogComponent>) { }

  ngOnInit() {
    const start = dayjs((this.data.timeline.start as Timestamp).toDate());
    const end = dayjs((this.data.timeline.end as Timestamp).toDate());
    this.form.patchValue({
      start: start.toDate(),
      startTime: start.format('hh:mm a').toString(),
      end: end.toDate(),
      endTime: end.format('hh:mm a').toString(),
    })
  }

  save() {
    if (this.form.valid) this.dialogRef.close(this.form.value);
  }
}
