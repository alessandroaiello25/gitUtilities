import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../toast.service';
import { HttpClient } from '@angular/common/http';
import { CredentialService } from '../credential.service';

// Define the interface for the release state.
export interface ReleaseState {
  targetBranch: string;
  mode: 'workitem' | 'manual';
  workItemId: string;
  manualBranches: string;
  computedBranches: string[];
  selectedBranches: string[]; // now supports multiple selections
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
  // The credential id is passed via the route.
  credentialId: string = '';
  // The overall state for the release process.
  state: ReleaseState = {
    targetBranch: '',
    mode: 'workitem',
    workItemId: '',
    manualBranches: '',
    computedBranches: [],
    selectedBranches: []
  };

  // Manage the current wizard step (1 or 2)
  currentStep: number = 1;
  // Base API URL – adjust as needed.
  private apiBase: string = 'http://localhost:3000/api';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private http: HttpClient,
    private credentialService: CredentialService
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
    // (We assume the backend will use this credentialId to get the correct Azure settings.)
  }

  /**
   * This method is called when the child step 1 component emits its "nextStep" event.
   * It receives a partial updated ReleaseState from the child.
   * If the release mode is workitem, it calls the backend with both workItemId and credentialId.
   * If in manual mode, it splits the manualBranches text into an array.
   */
  onStep1Next(updatedState: Partial<ReleaseState>): void {
    let oldWI = this.state.workItemId
    let oldMode = this.state.mode
    // Merge updated state
    this.state = { ...this.state, ...updatedState };
    if (this.state.mode === 'workitem' && (oldWI !== this.state.workItemId || oldMode!=this.state.mode || (oldWI==this.state.workItemId && this.state.computedBranches.length==0))) {
      if (!this.state.workItemId.trim()) {
        this.toastService.showToast('Error', 'Work item ID is required.');
        return;
      }
      const query = `?workitemId=${this.state.workItemId}&credentialId=${this.credentialId}`;
      this.http.get<{ wiToBranch: { [key: string]: string[] }, branchToWI: { [branch: string]: string }, branches: string[] }>
        (`${this.apiBase}/branches${query}`)
        .subscribe({
          next: res => {
            this.state.computedBranches = res.branches;
            this.state.wiToBranch = res.wiToBranch;
            this.state.branchMapping = res.branchToWI;
            if (this.state.computedBranches.length === 0) {
              this.toastService.showToast('Error', 'No branches found for this work item.');
              return;
            }
            // Initialize selectedBranches with the computed branches.
            this.state.selectedBranches = [...this.state.computedBranches];
            this.currentStep = 2;
          },
          error: err => {
            const msg = err.error?.error || 'Failed to retrieve branches.';
            this.toastService.showToast('Error', msg);
            console.error(err);
          }
        });
    } else {
      // Manual mode: split the entered manualBranches text by newlines.
      let lines = this.state.manualBranches.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if(this.state.mode === 'workitem') {
        lines = this.state.computedBranches.length>0 ? this.state.computedBranches : lines;
      }
      if (lines.length === 0) {
        this.toastService.showToast('Error', 'Please enter at least one branch.');
        return;
      }
      this.state.computedBranches = lines;
      this.state.selectedBranches = [...lines];
      this.currentStep = 2;
    }
  }

  // Called when the child step 2 component emits a "back" event.
  onStep2Back(): void {
    this.currentStep = 1;
  }

  // Called when the child step 2 component emits a "finish" event.
  onFinish(updatedState: Partial<ReleaseState>): void {
    // Merge final state
    this.state = { ...this.state, ...updatedState };
    if (!this.state.selectedBranches || this.state.selectedBranches.length === 0) {
      this.toastService.showToast('Error', 'Please select at least one branch.');
      return;
    }
    const summary = `Credential ID: ${this.credentialId}\n` +
                    `Target Branch: ${this.state.targetBranch}\n` +
                    `Mode: ${this.state.mode}\n` +
                    `Work Item ID: ${this.state.mode === 'workitem' ? this.state.workItemId : 'Manual'}\n` +
                    `Selected Branch(es): ${this.state.selectedBranches.join(', ')}`;
    this.toastService.showToast('Release Summary', summary);
    // Here you would trigger the next part of the release process.
  }
}
