import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-brewery-dialog',
  templateUrl: './brewery-dialog.component.html',
  styles: [`h2 img { height:50px }`],
})
export class BreweryDialogComponent {
  @ViewChild('list') list?: MatSelectionList;
  $brewery?: Observable<any>;
  form = new FormGroup({
    name: new FormControl('', [Validators.required])
  });
  constructor(private dialogRef: MatDialogRef<BreweryDialogComponent>,
    private http: HttpClient) { }

  save() {
    if (!this.form.valid || this.list?._value?.length === 0 || this.list?._value === undefined) return;
    this.dialogRef.close(this.list?._value?.map((o: any) => ({
      address: o.formatted_address,
      location: [o.geometry.location.lat, o.geometry.location.lng],
      name: o.name,
      placeId: o.place_id
    })));
  }

  search() {
    if (!this.form.valid) return;
    this.$brewery = this.http.post('https://us-central1-blastoise-5d78e.cloudfunctions.net/endpoints/brewery', {
      brewery: this.form.value.name
    });
    this.$brewery.subscribe(console.log);
  }
}
