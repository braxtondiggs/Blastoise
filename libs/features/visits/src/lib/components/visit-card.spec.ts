import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitCard } from './visit-card';

describe('VisitCard', () => {
  let component: VisitCard;
  let fixture: ComponentFixture<VisitCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitCard],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
