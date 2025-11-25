/**
 * Settings Page
 *
 * Main settings page for the web app
 */

import { Component } from '@angular/core';
import { SettingsComponent } from '@blastoise/features-settings';

@Component({
  selector: 'app-settings-page',
  imports: [SettingsComponent],
  template: `<app-settings />`,
  standalone: true,
})
export class SettingsPage {}
