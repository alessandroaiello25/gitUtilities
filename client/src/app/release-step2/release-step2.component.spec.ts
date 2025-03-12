import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReleaseStep2Component } from './release-step2.component';

describe('ReleaseStep2Component', () => {
  let component: ReleaseStep2Component;
  let fixture: ComponentFixture<ReleaseStep2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReleaseStep2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReleaseStep2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
