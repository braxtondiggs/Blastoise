import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// Leaflet will be dynamically imported
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
}

@Component({
  selector: 'lib-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [id]="mapId" class="w-full" [style.height.px]="height"></div>
  `,
  styles: []
})
export class MapComponent implements OnDestroy {
  @Input() mapId = 'map';
  @Input() height = 400;
  @Input() center: [number, number] = [37.7749, -122.4194]; // SF default
  @Input() zoom = 13;
  @Input() markers: MapMarker[] = [];
  @Output() markerClick = new EventEmitter<MapMarker>();

  private map: any = null; // Will be Leaflet map instance

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
