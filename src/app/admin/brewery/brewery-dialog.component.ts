import { HttpClient } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

interface BrewerySearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
}

interface BreweryData {
  address: string;
  location: [number, number];
  name: string;
  placeId: string;
  timeline: number;
}

@Component({
  selector: 'app-brewery-dialog',
  templateUrl: './brewery-dialog.component.html',
  styleUrls: ['./brewery-dialog.component.scss'],
})
export class BreweryDialogComponent {
  @ViewChild('list') list?: MatSelectionList;

  // State management
  public breweries: BrewerySearchResult[] = [];
  public isSearching = false;
  public hasSearched = false;
  public searchError?: string;
  public isProcessing = false;
  public selectedBreweries: BrewerySearchResult[] = [];
  public addingItems = new Set<string>();

  // Form
  public form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)])
  });

  constructor(
    private dialogRef: MatDialogRef<BreweryDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) { }

  trackByPlaceId(index: number, item: BrewerySearchResult): string {
    return item.place_id;
  }

  toggleSelection(brewery: BrewerySearchResult): void {
    if (this.addingItems.has(brewery.place_id)) {
      return; // Don't allow selection changes while adding
    }

    const index = this.selectedBreweries.findIndex(b => b.place_id === brewery.place_id);
    if (index > -1) {
      this.selectedBreweries.splice(index, 1);
    } else {
      this.selectedBreweries.push(brewery);
    }
  }

  isSelected(brewery: BrewerySearchResult): boolean {
    return this.selectedBreweries.some(b => b.place_id === brewery.place_id);
  }

  clearSearch(): void {
    this.form.reset();
    this.hasSearched = false;
    this.searchError = undefined;
    this.breweries = [];
    this.selectedBreweries = [];
  }

  search(): void {

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const breweryName = this.form.value.name?.trim();
    if (!breweryName) {
      return;
    }

    this.isSearching = true;
    this.searchError = undefined;
    this.selectedBreweries = [];
    this.breweries = [];

    // Make the HTTP request and subscribe to execute it
    this.http.post<BrewerySearchResult[]>(
      'https://us-central1-blastoise-5d78e.cloudfunctions.net/endpoints/brewery',
      {
        brewery: encodeURIComponent(breweryName)
      }
    ).pipe(
      map(results => {
        // Ensure we have an array and filter out any invalid results
        const validResults = Array.isArray(results) ? results.filter(r =>
          r && r.place_id && r.name && r.formatted_address
        ) : [];
        return validResults;
      }),
      catchError(error => {
        console.error('Search error:', error);
        this.searchError = error.error?.message || 'Failed to search for breweries. Please try again.';
        return of([]);
      }),
      finalize(() => {
        this.isSearching = false;
        this.hasSearched = true;
      })
    ).subscribe({
      next: (results) => {
        this.breweries = results;
      },
      error: (error) => {
        this.breweries = [];
      }
    });
  }

  async save(): Promise<void> {
    if (this.selectedBreweries.length === 0) {
      this.snackBar.open('Please select at least one brewery', 'Close', { duration: 3000 });
      return;
    }

    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Mark selected items as being added
      this.selectedBreweries.forEach(brewery => {
        this.addingItems.add(brewery.place_id);
      });

      // Convert to the expected format
      const breweryData: BreweryData[] = this.selectedBreweries.map(brewery => ({
        address: brewery.formatted_address,
        location: [brewery.geometry.location.lat, brewery.geometry.location.lng],
        name: brewery.name,
        placeId: brewery.place_id,
        timeline: 0
      }));

      // Close dialog with data
      this.dialogRef.close(breweryData);

      // Show success message
      const message = breweryData.length === 1
        ? `Added "${breweryData[0].name}" successfully`
        : `Added ${breweryData.length} breweries successfully`;

      this.snackBar.open(message, 'Close', { duration: 3000 });

    } catch (error: any) {
      console.error('Error saving breweries:', error);
      this.snackBar.open(
        error.message || 'Failed to add breweries. Please try again.',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.isProcessing = false;
      this.addingItems.clear();
    }
  }
}
