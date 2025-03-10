// src/app/toast.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ToastMessage {
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toast$: Observable<ToastMessage> = this.toastSubject.asObservable();

  showToast(title: string, message: string): void {
    this.toastSubject.next({ title, message });
  }
}
