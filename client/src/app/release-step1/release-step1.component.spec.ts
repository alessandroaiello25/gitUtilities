import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseStep1Component } from './release-step1.component';

describe('ReleaseStep1Component', () => {
  let component: ReleaseStep1Component;
  let fixture: ComponentFixture<ReleaseStep1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseStep1Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReleaseStep1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
