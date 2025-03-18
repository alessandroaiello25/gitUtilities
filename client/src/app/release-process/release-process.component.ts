import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CredentialService, Credential } from '../credential.service';
import { ToastService } from '../toast.service';
import { HttpClient } from '@angular/common/http';

export interface ReleaseState {
  targetBranch: string;
  mode: 'workitem' | 'manual';
  workItemId: string;
  manualBranches: string; // A string containing branch names (for manual mode)
  computedBranches: string[];
  selectedBranch: string;
  // Optionally, store mappings for further use
  wiToBranch?: { [key: string]: string[] };
  branchMapping?: { [branch: string]: string };
}

@Component({
  selector: 'app-release-process',
  templateUrl: './release-process.component.html',
  styleUrls: ['./release-process.component.css'],
  standalone: false
})
export class ReleaseProcessComponent implements OnInit {
  credentialId: string = '';
  credential!: Credential;
  state: ReleaseState = {
    targetBranch: '',
    mode: 'workitem',
    workItemId: '',
    manualBranches: '',
    computedBranches: [],
    selectedBranch: ''
  };

  // Manage current step: 1 = input (child step1), 2 = branch selection (child step2)
  currentStep: number = 1;
  // Base API URL – adjust as needed.
  private apiBase: string = 'http://localhost:3000/api';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private credentialService: CredentialService,
    private toastService: ToastService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Retrieve the credential id from the route.
    const credId = this.route.snapshot.paramMap.get('id');
    if (!credId) {
      this.toastService.showToast('Error', 'No credential id provided.');
      this.router.navigate(['/list']);
      return;
    }
    this.credentialId = credId;
    // Instead of loading full credential details here,
    // we assume that later the backend will check the credential by id.
    // (If needed, you can load credential details here.)
  }

  // This method is called by the Step1 child when the user submits input.
  onStep1Next(updatedState: Partial<ReleaseState>): void {
    // Merge the input state.
    this.state = { ...this.state, ...updatedState };

    if (this.state.mode === 'workitem') {
      // Validate required field.
      if (!this.state.workItemId.trim()) {
        this.toastService.showToast('Error', 'Work item ID is required.');
        return;
      }
      // Call the backend endpoint with workItemId and credentialId.
      const query = `?workitemId=${this.state.workItemId}&credentialId=${this.credentialId}`;
      this.http.get<{ wiToBranch: { [key: string]: string[] }, branchToWI: { [key: string]: string }, branches: string[] }>
        (`${this.apiBase}/branches/from-workitem${query}`)
        .subscribe({
          next: res => {
            // Look up mapping for the provided work item ID.
            const wiKey = this.state.workItemId.toString();
            if (res.wiToBranch && res.wiToBranch[wiKey]) {
              this.state.computedBranches = res.wiToBranch[wiKey];
            } else {
              this.state.computedBranches = res.branches;
            }
            this.state.wiToBranch = res.wiToBranch;
            this.state.branchMapping = res.branchToWI;
            if (this.state.computedBranches.length === 0) {
              this.toastService.showToast('Error', 'No branches found for this work item.');
              return;
            }
            // Auto-select if only one branch is returned.
            if (this.state.computedBranches.length === 1) {
              this.state.selectedBranch = this.state.computedBranches[0];
            } else {
              // Otherwise, default to first branch.
              this.state.selectedBranch = this.state.computedBranches[0];
            }
            this.currentStep = 2;
          },
          error: err => {
            const msg = err.error?.error || 'Failed to retrieve branches.';
            this.toastService.showToast('Error', msg);
            console.error(err);
          }
        });
    } else {
      // Manual mode: split the manualBranches string by newline.
      const lines = this.state.manualBranches.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      if (lines.length === 0) {
        this.toastService.showToast('Error', 'Please enter at least one branch.');
        return;
      }
      this.state.computedBranches = lines;
      this.state.selectedBranch = lines[0];
      this.currentStep = 2;
    }
  }

  // Called by the Step2 child when the user clicks "Back" from Step2.
  onStep2Back(): void {
    this.currentStep = 1;
  }

  // Called by the Step2 child when the user finishes selection.
  onFinish(updatedState: Partial<ReleaseState>): void {
    this.state = { ...this.state, ...updatedState };
    const summary = `Credential ID: ${this.credentialId}\n` +
                    `Target Branch: ${this.state.targetBranch}\n` +
                    `Work Item: ${this.state.mode === 'workitem' ? this.state.workItemId : 'Manual'}\n` +
                    `Selected Branch: ${this.state.selectedBranch}`;
    this.toastService.showToast('Release Summary', summary);
    // Here, you would trigger the release process with the complete state.
  }
}
