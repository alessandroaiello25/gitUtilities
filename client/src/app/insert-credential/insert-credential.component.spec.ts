import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsertCredentialComponent } from './insert-credential.component';

describe('InsertCredentialComponent', () => {
  let component: InsertCredentialComponent;
  let fixture: ComponentFixture<InsertCredentialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsertCredentialComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InsertCredentialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
