/**
 * Public shared visit page (no authentication required)
 *
 * Displays anonymized visit information via public share link.
 * This route does NOT require authentication - anyone with the link can view.
 */

import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedVisitView } from '@blastoise/features/sharing';

@Component({
  selector: 'app-shared-visit-page',
  imports: [CommonModule, SharedVisitView],
  template: `
    <div class="min-h-screen bg-base-100 py-8">
      <div class="container mx-auto px-4 max-w-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold">Shared Visit</h1>
          <a href="/" class="btn btn-sm btn-ghost">
            View App
          </a>
        </div>

        <!-- Shared Visit Component -->
        <app-shared-visit-view [shareId]="shareId()" />
      </div>
    </div>
  `,
  standalone: true,
})
export class SharedVisitPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly shareId = signal<string>('');

  ngOnInit(): void {
    // Extract share ID from route params
    const shareId = this.route.snapshot.paramMap.get('shareId');

    if (!shareId) {
      // No share ID provided, redirect to home
      this.router.navigate(['/']);
      return;
    }

    this.shareId.set(shareId);
  }
}
