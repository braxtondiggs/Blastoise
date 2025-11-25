import { Component } from '@angular/core';
import { AuthCallback } from '@blastoise/features-auth';

/**
 * Auth Callback Page
 *
 * Page wrapper that imports the shared AuthCallback component.
 * This page handles the magic link authentication callback.
 */
@Component({
  selector: 'app-callback-page',
  standalone: true,
  imports: [AuthCallback],
  template: '<lib-auth-callback />',
})
export default class CallbackPage {}
