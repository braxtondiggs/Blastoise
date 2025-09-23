import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocationService, LocationPermissionStatus, LocationSettings } from '../../core/services/location.service';

// Angular Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-location-permissions',
  templateUrl: './location-permissions.component.html',
  styleUrls: ['./location-permissions.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatExpansionModule,
    MatListModule,
    MatDividerModule,
    MatDialogModule
  ]
})
export class LocationPermissionsComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<LocationPermissionsComponent>, { optional: true });

  // Component state
  readonly isRequesting = signal(false);
  readonly permissionStatus = signal(LocationPermissionStatus.UNKNOWN);
  readonly isTracking = signal(false);

  // Form for location settings
  settingsForm: FormGroup;

  // Computed properties
  readonly canRequestPermission = computed(() =>
    this.permissionStatus() === LocationPermissionStatus.UNKNOWN ||
    this.permissionStatus() === LocationPermissionStatus.PROMPT
  );

  readonly hasPermission = computed(() =>
    this.permissionStatus() === LocationPermissionStatus.GRANTED
  );

  readonly isPermissionDenied = computed(() =>
    this.permissionStatus() === LocationPermissionStatus.DENIED
  );

  // Enum references for template
  readonly LocationPermissionStatus = LocationPermissionStatus;

  // Tracking interval options
  readonly trackingIntervals = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' }
  ];

  constructor() {
    // Initialize settings form
    const currentSettings = this.locationService.getSettings();
    this.settingsForm = this.fb.group({
      enabled: [currentSettings.enabled],
      trackingInterval: [currentSettings.trackingInterval, Validators.required],
      highAccuracy: [currentSettings.highAccuracy],
      significantChangeOnly: [currentSettings.significantChangeOnly]
    });
  }

  ngOnInit(): void {
    // Subscribe to permission status changes
    this.locationService.permissionStatus.subscribe(status => {
      this.permissionStatus.set(status);
    });

    // Subscribe to tracking status changes
    this.locationService.isTracking.subscribe(tracking => {
      this.isTracking.set(tracking);
    });

    // Watch for form changes and update settings
    this.settingsForm.valueChanges.subscribe(values => {
      this.updateLocationSettings(values);
    });
  }

  /**
   * Request location permissions from the user
   */
  async requestPermissions(): Promise<void> {
    this.isRequesting.set(true);

    try {
      const status = await this.locationService.requestPermissions();

      if (status === LocationPermissionStatus.GRANTED) {
        this.snackBar.open('Location permissions granted! 🎉', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });

        // Auto-enable tracking if permission granted
        this.settingsForm.patchValue({ enabled: true });

      } else if (status === LocationPermissionStatus.DENIED) {
        this.snackBar.open('Location permissions denied. You can enable them in browser settings.', 'Dismiss', {
          duration: 5000,
          panelClass: ['warning-snackbar']
        });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      this.snackBar.open('Failed to request location permissions. Please try again.', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isRequesting.set(false);
    }
  }

  /**
   * Toggle location tracking
   */
  async toggleTracking(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        if (this.hasPermission()) {
          const settings = this.settingsForm.value as LocationSettings;
          await this.locationService.startTracking(settings);

          this.snackBar.open('Background location tracking started 📍', 'Dismiss', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        } else {
          // Request permissions first
          await this.requestPermissions();
          return;
        }
      } else {
        this.locationService.stopTracking();
        this.snackBar.open('Location tracking stopped', 'Dismiss', {
          duration: 2000,
          panelClass: ['info-snackbar']
        });
      }
    } catch (error) {
      console.error('Failed to toggle tracking:', error);
      this.snackBar.open('Failed to change tracking settings. Please try again.', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });

      // Revert the toggle
      this.settingsForm.patchValue({ enabled: !enabled }, { emitEvent: false });
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(): Promise<void> {
    try {
      this.isRequesting.set(true);
      const location = await this.locationService.getCurrentPosition();

      this.snackBar.open(
        `Current location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        'Dismiss',
        {
          duration: 5000,
          panelClass: ['info-snackbar']
        }
      );
    } catch (error) {
      console.error('Failed to get current location:', error);
      this.snackBar.open('Failed to get current location. Please check permissions.', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isRequesting.set(false);
    }
  }

  /**
   * Manually sync queued location data
   */
  async syncLocationData(): Promise<void> {
    try {
      this.isRequesting.set(true);
      await this.locationService.sendLocationData();

      this.snackBar.open('Location data synchronized successfully! ✅', 'Dismiss', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Failed to sync location data:', error);
      this.snackBar.open('Failed to sync location data. Check your internet connection.', 'Dismiss', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isRequesting.set(false);
    }
  }

  /**
   * Handle tracking toggle change
   */
  onTrackingToggle(enabled: boolean): void {
    this.toggleTracking(enabled);
  }

  /**
   * Update location settings
   */
  private updateLocationSettings(formValues: any): void {
    const settings: Partial<LocationSettings> = {
      enabled: formValues.enabled,
      trackingInterval: formValues.trackingInterval,
      highAccuracy: formValues.highAccuracy,
      significantChangeOnly: formValues.significantChangeOnly
    };

    this.locationService.updateSettings(settings);
  }

  /**
   * Get permission status display text
   */
  getPermissionStatusText(): string {
    switch (this.permissionStatus()) {
      case LocationPermissionStatus.GRANTED:
        return 'Granted';
      case LocationPermissionStatus.DENIED:
        return 'Denied';
      case LocationPermissionStatus.PROMPT:
        return 'Not requested';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get permission status icon
   */
  getPermissionStatusIcon(): string {
    switch (this.permissionStatus()) {
      case LocationPermissionStatus.GRANTED:
        return 'check_circle';
      case LocationPermissionStatus.DENIED:
        return 'block';
      case LocationPermissionStatus.PROMPT:
        return 'help_outline';
      default:
        return 'help_outline';
    }
  }

  /**
   * Close the dialog
   */
  closeDialog(): void {
    this.dialogRef?.close();
  }
}
