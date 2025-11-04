import { Component } from '@angular/core';
import { Login } from '@blastoise/features-auth';

/**
 * Login page wrapper for web application
 * Imports the shared Login component from the auth feature library
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [Login],
  template: '<lib-login></lib-login>',
})
export class LoginPageComponent {}
