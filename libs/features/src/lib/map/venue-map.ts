import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { Venue, Coordinates } from '@blastoise/shared';
import * as L from 'leaflet';
import 'leaflet.markercluster';

/**
 * Interactive map displaying nearby breweries and wineries with:
 * - User location marker
 * - Venue markers (clustered)
 * - Custom markers for visited vs unvisited venues
 * - Venue popup with basic info
 * - OpenStreetMap tile layer
 */
@Component({
  selector: 'app-venue-map',
  imports: [CommonModule],
  templateUrl: './venue-map.html',
  standalone: true,
})
export class VenueMap implements OnInit, OnDestroy, AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private map: L.Map | null = null;
  private markerClusterGroup: L.MarkerClusterGroup | null = null;
  private userLocationMarker: L.Marker | null = null;
  private venueMarkers = new Map<string, L.Marker>();

  // Inputs
  @Input() venues: Venue[] = [];
  @Input() visitedVenueIds: string[] = [];
  @Input() userLocation: Coordinates | null = null;
  @Input() initialZoom = 12;

  // Outputs
  @Output() venueSelected = new EventEmitter<Venue>();
  @Output() mapReady = new EventEmitter<L.Map>();
  @Output() boundsChanged = new EventEmitter<L.LatLngBounds>();

  // Signals
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Map initialization happens in ngAfterViewInit
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeMap();
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  /**
   * Initialize Leaflet map with OpenStreetMap tiles
   */
  private initializeMap(): void {
    try {
      this.isLoading.set(true);

      // Fix Leaflet default icon paths (webpack/bundler issue)
      // @ts-expect-error Leaflet type definitions don't include _getIconUrl
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Create map instance with keyboard navigation
      this.map = L.map('venue-map', {
        center: this.getInitialCenter(),
        zoom: this.initialZoom,
        zoomControl: true,
        attributionControl: true,
        keyboard: true,
        keyboardPanDelta: 80,
      });

      // Add dark theme tile layer from CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(this.map);

      // Initialize MarkerCluster group with optimized threshold
      this.markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50, // Radius in pixels for clustering
        spiderfyOnMaxZoom: true, // Spread out markers at max zoom
        showCoverageOnHover: false, // Don't show cluster bounds on hover
        zoomToBoundsOnClick: true, // Zoom to cluster bounds on click
        disableClusteringAtZoom: 18, // Disable clustering at street level
        chunkedLoading: true, // Better performance for large marker sets
        chunkInterval: 200, // Process markers in chunks
        chunkDelay: 50, // Delay between chunks (ms)
      });
      this.map.addLayer(this.markerClusterGroup);

      // Listen for bounds changes
      this.map.on('moveend', () => {
        if (this.map) {
          this.boundsChanged.emit(this.map.getBounds());
        }
      });

      // Add user location marker if available
      if (this.userLocation) {
        this.updateUserLocation(this.userLocation);
      }

      // Add venue markers
      this.updateVenueMarkers();

      this.mapReady.emit(this.map);
      this.isLoading.set(false);
    } catch (error) {
      this.errorMessage.set('Failed to initialize map');
      this.isLoading.set(false);
      console.error('Map initialization error:', error);
    }
  }

  /**
   * Get initial map center from user location or default
   */
  private getInitialCenter(): [number, number] {
    if (this.userLocation) {
      return [this.userLocation.latitude, this.userLocation.longitude];
    }
    // Default to Portland, OR
    return [45.5231, -122.6765];
  }

  /**
   * Update user location marker
   */
  updateUserLocation(location: Coordinates): void {
    if (!this.map) return;

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([
        location.latitude,
        location.longitude,
      ]);
    } else {
      // Create user location marker with custom icon
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div class="pulse"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      this.userLocationMarker = L.marker(
        [location.latitude, location.longitude],
        { icon: userIcon }
      ).addTo(this.map);

      this.userLocationMarker.bindPopup('Your Location');
    }

    // Center map on user location
    this.map.setView([location.latitude, location.longitude], this.initialZoom);
  }

  /**
   * Update venue markers with custom icons for visited/unvisited
   */
  updateVenueMarkers(): void {
    if (!this.map || !this.markerClusterGroup) return;

    // Clear existing venue markers
    this.venueMarkers.forEach((marker) => {
      this.markerClusterGroup!.removeLayer(marker);
    });
    this.venueMarkers.clear();

    // Add new venue markers
    this.venues.forEach((venue) => {
      const isVisited = this.visitedVenueIds.includes(venue.id);
      const marker = this.createVenueMarker(venue, isVisited);
      this.venueMarkers.set(venue.id, marker);
      this.markerClusterGroup!.addLayer(marker);
    });
  }

  /**
   * Create venue marker with custom icon
   */
  private createVenueMarker(venue: Venue, isVisited: boolean): L.Marker {
    // Custom icon for visited vs unvisited
    const iconClass = isVisited ? 'venue-marker-visited' : 'venue-marker';
    const iconColor = isVisited ? '#10b981' : '#3b82f6';
    const icon = L.divIcon({
      className: iconClass,
      html: `<div class="marker-pin" style="background-color: ${iconColor};">
               <span class="marker-icon">${venue.venue_type === 'brewery' ? '🍺' : '🍷'}</span>
             </div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });

    const marker = L.marker([venue.latitude, venue.longitude], {
      icon,
    });

    // Add venue popup with basic info
    marker.bindPopup(this.createVenuePopup(venue, isVisited));

    // Emit venue selection on marker click
    marker.on('click', () => {
      this.venueSelected.emit(venue);
    });

    return marker;
  }

  /**
   * Create venue popup HTML
   */
  private createVenuePopup(venue: Venue, isVisited: boolean): string {
    const visitedBadge = isVisited
      ? '<span class="badge badge-success">Visited</span>'
      : '';

    const addressLine = venue.address || '';
    const cityState = [venue.city, venue.state_province].filter(Boolean).join(', ');
    const fullAddress = [addressLine, cityState, venue.postal_code].filter(Boolean).join('<br>');

    return `
      <div class="venue-popup">
        <h3 class="text-lg font-bold">${venue.name}</h3>
        <p class="text-sm text-gray-600">${venue.venue_type === 'brewery' ? 'Brewery' : 'Winery'}</p>
        ${visitedBadge}
        ${fullAddress ? `<p class="text-sm mt-2">${fullAddress}</p>` : ''}
        <button class="btn btn-primary btn-sm mt-2 view-details-btn">
          View Details
        </button>
      </div>
    `;
  }

  /**
   * Update venues based on current viewport
   */
  loadVenuesInViewport(venues: Venue[]): void {
    this.venues = venues;
    this.updateVenueMarkers();
  }

  /**
   * Center map on specific coordinates
   */
  centerOn(location: Coordinates, zoom?: number): void {
    if (this.map) {
      this.map.setView([location.latitude, location.longitude], zoom || this.initialZoom);
    }
  }

  /**
   * Fit map to show all venue markers
   */
  fitToVenues(): void {
    if (!this.map || this.venues.length === 0) return;

    const bounds = L.latLngBounds(
      this.venues.map((v) => [v.latitude, v.longitude])
    );

    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * Get current map bounds
   */
  getCurrentBounds(): L.LatLngBounds | null {
    return this.map?.getBounds() || null;
  }

  /**
   * Cleanup map instance
   */
  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markerClusterGroup = null;
    this.userLocationMarker = null;
    this.venueMarkers.clear();
  }
}
