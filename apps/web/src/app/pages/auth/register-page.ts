import { Component } from '@angular/core';
import { Registration } from '@blastoise/features-auth';

/**
 * Registration Page
 *
 * Page wrapper that imports the shared Registration component.
 * This page allows new users to create an account.
 */
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [Registration],
  template: '<lib-registration />',
})
export default class RegisterPage {}
