import { Pipe, PipeTransform } from '@angular/core';
import { formatDistance } from '@blastoise/shared';

@Pipe({
  name: 'distance',
  standalone: true
})
export class DistancePipe implements PipeTransform {
  transform(distanceKm: number | null | undefined, unit: 'metric' | 'imperial' = 'metric'): string {
    if (distanceKm == null) return '';
    return formatDistance(distanceKm, unit);
  }
}
