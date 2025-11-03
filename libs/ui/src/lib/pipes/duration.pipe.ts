import { Pipe, PipeTransform } from '@angular/core';
import { formatDuration } from '@blastoise/shared';

@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    if (minutes == null) return '';
    return formatDuration(minutes);
  }
}
