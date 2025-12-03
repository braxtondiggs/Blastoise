import { Injectable, inject, InjectionToken, Inject, Optional, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

/**
 * Injection token for API base URL
 */
export const FEATURE_FLAGS_API_URL = new InjectionToken<string>('FEATURE_FLAGS_API_URL');

/**
 * Feature flags configuration from backend
 */
export interface FeatureFlags {
  guest_mode: boolean;
  magic_link: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  guest_mode: false,
  magic_link: false,
};

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl: string;

  // Reactive state using signals
  private readonly _flags = signal<FeatureFlags>(DEFAULT_FLAGS);
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);

  // Public readonly signals
  readonly flags = this._flags.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly loading = this._loading.asReadonly();

  // Computed convenience accessors
  readonly guestModeEnabled = computed(() => this._flags().guest_mode);
  readonly magicLinkEnabled = computed(() => this._flags().magic_link);

  constructor(@Optional() @Inject(FEATURE_FLAGS_API_URL) apiUrl?: string) {
    this.apiUrl = apiUrl || 'http://localhost:3000/api/v1';
    this.loadFlags();
  }

  /**
   * Load feature flags from backend
   */
  loadFlags(): void {
    if (this._loading()) return;

    this._loading.set(true);

    this.http
      .get<{ features: FeatureFlags }>(`${this.apiUrl}/config`)
      .pipe(
        tap((response) => {
          this._flags.set(response.features);
          this._loaded.set(true);
          this._loading.set(false);
        }),
        catchError((error) => {
          console.error('Failed to load feature flags:', error);
          this._loading.set(false);
          this._loaded.set(true); // Mark as loaded even on error to prevent retries
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Check if a specific feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this._flags()[feature];
  }
}
