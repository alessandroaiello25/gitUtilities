import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ReleaseService } from '../release.service';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-release-step1',
  templateUrl: './release-step1.component.html',
  styleUrls: ['./release-step1.component.css']
})
export class ReleaseStep1Component {
  // Base API URL – adjust as needed.
  private apiBase: string = 'http://localhost:3000/api';

  constructor(
    private router: Router,
    private releaseService: ReleaseService,
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  nextStep(): void {
    // Validate target branch.
    if (!this.releaseService.targetBranch.trim()) {
      this.toastService.showToast('Error', 'Target branch is required.');
      return;
    }
    // Mode-specific validation.
    if (this.releaseService.mode === 'workitem') {
      if (!this.releaseService.workItemId.trim()) {
        this.toastService.showToast('Error', 'Work item ID is required.');
        return;
      }
      // Call the server endpoint to get branch mappings.
      this.http.get<{ wiToBranch: { [key: string]: string[] }, branchToWI: { [key: string]: string }, branches: string[] }>
        (`${this.apiBase}/branches?workitemId=${this.releaseService.workItemId}`)
        .subscribe({
          next: res => {
            // If a mapping exists for the work item, use that array; otherwise, use the full branches list.
            const wi = this.releaseService.workItemId;
            if (res.wiToBranch && res.wiToBranch[wi]) {
              this.releaseService.computedBranches = res.wiToBranch[wi];
            } else {
              this.releaseService.computedBranches = res.branches;
            }
            // Save the full mappings if needed.
            this.releaseService.wiToBranch = res.wiToBranch;
            this.releaseService.branchMapping = res.branchToWI;
            if (this.releaseService.computedBranches.length === 0) {
              this.toastService.showToast('Error', 'No branches found for this work item.');
              return;
            }
            // If only one branch, auto-select it.
            if (this.releaseService.computedBranches.length === 1) {
              this.releaseService.selectedBranch = this.releaseService.computedBranches[0];
              this.router.navigate(['/release/step2']);
            } else {
              // Otherwise, move to step 2.
              this.releaseService.selectedBranch = this.releaseService.computedBranches[0]; // default
              this.router.navigate(['/release/step2']);
            }
          },
          error: err => {
            const msg = err.error?.error || 'Failed to retrieve branches.';
            this.toastService.showToast('Error', msg);
            console.error(err);
          }
        });
    } else {
      // Manual mode: split the entered text (assumed comma- or newline-separated).
      const lines = this.releaseService.manualBranches;
      if (!lines || lines.length === 0) {
        this.toastService.showToast('Error', 'Please enter at least one branch.');
        return;
      }
      // In manual mode, we already have a manual array.
      this.releaseService.computedBranches = lines;
      // Default selection.
      this.releaseService.selectedBranch = lines[0];
      this.router.navigate(['/release/step2']);
    }
  }
}
