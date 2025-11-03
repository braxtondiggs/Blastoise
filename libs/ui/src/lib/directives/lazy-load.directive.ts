import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[libLazyLoad]',
  standalone: true
})
export class LazyLoadDirective implements OnInit {
  @Input() libLazyLoad!: string;

  private readonly el = inject(ElementRef<HTMLImageElement>);

  ngOnInit() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage();
            observer.disconnect();
          }
        });
      });

      observer.observe(this.el.nativeElement);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage();
    }
  }

  private loadImage() {
    const img = this.el.nativeElement;
    img.src = this.libLazyLoad;
  }
}
