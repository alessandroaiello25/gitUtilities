// src/app/credential-list/credential-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CredentialService, Credential } from '../credential.service';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-credential-list',
  templateUrl: './credential-list.component.html',
  styleUrls: ['./credential-list.component.css']
})
export class CredentialListComponent implements OnInit {
  credentials: Credential[] = [];

  constructor(
    private credentialService: CredentialService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCredentials();
  }

  loadCredentials(): void {
    this.credentialService.getCredentials().subscribe({
      next: data => {
        this.credentials = data;
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
}
