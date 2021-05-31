
import { NgModule } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
@NgModule({
  exports: [MatToolbarModule, MatFormFieldModule, MatButtonModule, MatInputModule,
    MatIconModule],
  imports: [MatToolbarModule, MatFormFieldModule, MatButtonModule, MatInputModule,
    MatIconModule]
})

export class MaterialModule { }
