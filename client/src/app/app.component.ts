// src/app/app.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastService, ToastMessage } from './toast.service';
import { Subscription } from 'rxjs';

// Declare bootstrap for TypeScript (assuming Bootstrap JS is loaded globally)
declare var bootstrap: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Azure Credential Manager';
  toastMessage: ToastMessage | null = null;
  toastSubscription!: Subscription;
  
  // Get a reference to the toast element in the template
  @ViewChild('toast', { static: false }) toastElement!: ElementRef;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastSubscription = this.toastService.toast$.subscribe(message => {
      this.toastMessage = message;
      // Wait a tick for the view to update, then show the toast
      setTimeout(() => {
        if (this.toastElement) {
          const toastInstance = new bootstrap.Toast(this.toastElement.nativeElement, { delay: 3000 });
          toastInstance.show();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.toastSubscription.unsubscribe();
  }
}
