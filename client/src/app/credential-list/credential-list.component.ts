// src/app/credential-list/credential-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CredentialService, Credential } from '../credential.service';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';

@Component({
    selector: 'app-credential-list',
    templateUrl: './credential-list.component.html',
    styleUrls: ['./credential-list.component.css'],
    standalone: false
})
export class CredentialListComponent implements OnInit {
  credentials: Credential[] = [];
  isLoading: boolean = false;  // Controls the loader display

  constructor(
    private credentialService: CredentialService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCredentials();
  }

  loadCredentials(): void {
    this.isLoading = true;
    this.credentialService.getCredentials().subscribe({
      next: data => {
        this.credentials = data;
        this.isLoading = false;
        // Log project_path values for internal use (not displayed)
        console.log('Loaded credentials with project paths:', this.credentials.map(c => c.project_path));
      },
      error: err => {
        this.toastService.showToast('Error', 'Error loading credentials');
        console.error('Error loading credentials', err);
      }
    });
  }

  updateCredential(cred: Credential): void {
    // Example: Use project_path in JS logic if needed
    console.log('Updating credential with project path:', cred.project_path);
    this.router.navigate(['/update', cred.id]);
  }

  deleteCredential(cred: Credential): void {
    if (confirm('Are you sure you want to delete this credential?')) {
      this.credentialService.deleteCredential(cred.id).subscribe({
        next: res => {
          this.toastService.showToast('Success', res.message);
          this.loadCredentials();
        },
        error: err => {
          this.toastService.showToast('Error', 'Error deleting credential');
          console.error(err);
        }
      });
    }
  }

  // Toggle the active flag using a checkbox.
  toggleActive(cred: Credential, event: any): void {
    // If the checkbox is checked and the credential is not already active,
    // call the API to set it as active.
    if (event.target.checked && !cred.active) {
      this.credentialService.activateCredential(cred.id)
        .subscribe({
          next: res => {
            this.toastService.showToast('Success', res.message);
            this.loadCredentials();
          },
          error: err => {
            this.toastService.showToast('Error', 'Error updating active credential');
            console.error(err);
          }
        });
    } else if (!event.target.checked && cred.active) {
      // Optionally, you might not allow toggling off active since one should remain active.
      // For now, if user tries to toggle off, reset the checkbox to true.
      event.target.checked = true;
      this.toastService.showToast('Info', 'At least one credential must remain active.');
    }
  }

  // New method to navigate to the insert credential page.
  goToInsert(): void {
    this.router.navigate(['/insert']);
  }
}
