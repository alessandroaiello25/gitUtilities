import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseProcessComponent } from './release-process.component';

describe('ReleaseProcessComponent', () => {
  let component: ReleaseProcessComponent;
  let fixture: ComponentFixture<ReleaseProcessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseProcessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReleaseProcessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
