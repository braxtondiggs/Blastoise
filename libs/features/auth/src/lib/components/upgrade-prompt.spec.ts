import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpgradePrompt } from './upgrade-prompt';

describe('UpgradePrompt', () => {
  let component: UpgradePrompt;
  let fixture: ComponentFixture<UpgradePrompt>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpgradePrompt],
    }).compileComponents();

    fixture = TestBed.createComponent(UpgradePrompt);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
