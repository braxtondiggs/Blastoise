import { signal, WritableSignal } from '@angular/core';

/**
 * Loading state utility for managing async operations
 * Provides a reusable pattern for tracking loading states across components
 */

export interface LoadingState {
  isLoading: WritableSignal<boolean>;
  error: WritableSignal<string | null>;
  success: WritableSignal<boolean>;
}

/**
 * Creates a loading state object with signals
 * Usage:
 * ```typescript
 * const loadingState = createLoadingState();
 *
 * async function submit() {
 *   loadingState.isLoading.set(true);
 *   try {
 *     await someAsyncOperation();
 *     loadingState.success.set(true);
 *   } catch (error) {
 *     loadingState.error.set(error.message);
 *   } finally {
 *     loadingState.isLoading.set(false);
 *   }
 * }
 * ```
 */
export function createLoadingState(): LoadingState {
  return {
    isLoading: signal(false),
    error: signal<string | null>(null),
    success: signal(false),
  };
}

/**
 * Resets a loading state to initial values
 */
export function resetLoadingState(state: LoadingState): void {
  state.isLoading.set(false);
  state.error.set(null);
  state.success.set(false);
}

/**
 * Sets loading state to loading
 */
export function setLoading(state: LoadingState): void {
  state.isLoading.set(true);
  state.error.set(null);
  state.success.set(false);
}

/**
 * Sets loading state to success
 */
export function setSuccess(state: LoadingState): void {
  state.isLoading.set(false);
  state.error.set(null);
  state.success.set(true);
}

/**
 * Sets loading state to error
 */
export function setError(state: LoadingState, errorMessage: string): void {
  state.isLoading.set(false);
  state.error.set(errorMessage);
  state.success.set(false);
}
