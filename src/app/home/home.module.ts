import { NgModule } from '@angular/core';
import { SharedModule } from '../core/shared.module';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { MatCardModule } from '@angular/material/card';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    HomeRoutingModule,
    MatCardModule,
    SharedModule
  ]
})
export class HomeModule { }
