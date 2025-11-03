import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-login',
  imports: [],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class Login {}
