import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CredentialService } from '../credential.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-insert-credential',
  templateUrl: './insert-credential.component.html',
  styleUrls: ['./insert-credential.component.css']
})
export class InsertCredentialComponent {
  credential = {
    azure_org_url: '',
    project: '',
    repository: '',
    project_path: '', // This field now stores the absolute folder path as text
    pat: ''
  };

  constructor(
    private credentialService: CredentialService,
    private router: Router,
    private toastService: ToastService
  ) {}


  /**
   * Validates the entered project path based on the user's OS.
   * - Windows: Must start with a drive letter, colon and backslash (e.g. "C:\")
   * - Unix/Linux/macOS: Must start with a forward slash (e.g. "/")
   */
  validateProjectPath(path: string): boolean {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.indexOf('win') >= 0) {
      // Simple regex: drive letter, colon, backslash, then anything
      const winRegex = /^[a-zA-Z]:\\(?:[^\\\/:*?"<>|\r\n]+\\)*[^\\\/:*?"<>|\r\n]*$/;
      return winRegex.test(path);
    } else {
      // For Unix-like OS: path should start with '/'
      return path.startsWith('/');
    }
  }

  insertCredential(): void {
    // Validate the project path before submission
    if (!this.validateProjectPath(this.credential.project_path)) {
      this.toastService.showToast('Error', 'Invalid project path for your OS.');
      return;
    }
    
    this.credentialService.insertCredential(this.credential).subscribe({
      next: res => {
        this.toastService.showToast('Success', res.message);
        this.router.navigate(['/list']);
      },
      error: err => {
        if (err.error && err.error.error === 'Credential already exists.') {
          this.toastService.showToast('Error', 'Credential already exists.');
        } else if (err.error && err.error.error) {
          this.toastService.showToast('Error', err.error.error);
        } else {
          this.toastService.showToast('Error', 'Error inserting credential.');
        }
        console.error(err);
      }
    });
  }
}
