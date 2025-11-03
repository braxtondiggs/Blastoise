import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveVisit } from './active-visit';

describe('ActiveVisit', () => {
  let component: ActiveVisit;
  let fixture: ComponentFixture<ActiveVisit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveVisit],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveVisit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
