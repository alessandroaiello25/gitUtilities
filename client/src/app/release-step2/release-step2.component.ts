// src/app/start-release-step2/start-release-step2.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ReleaseService } from '../release.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-release-step2',
  templateUrl: './release-step2.component.html',
  styleUrls: ['./release-step2.component.css']
})
export class ReleaseStep2Component {
  constructor(
    public releaseService: ReleaseService,
    private router: Router,
    private toastService: ToastService
  ) {}

  prevStep(): void {
    this.router.navigate(['/release/step1']);
  }

  finish(): void {
    if (!this.releaseService.selectedBranch.trim()) {
      this.toastService.showToast('Error', 'Please select a branch.');
      return;
    }
    const summary = `Target Branch: ${this.releaseService.targetBranch}\n` +
                    `Work Item ID: ${this.releaseService.workItemId}\n` +
                    `Selected Branch: ${this.releaseService.selectedBranch}`;
    this.toastService.showToast('Release Summary', summary);
    // In a full implementation, you would trigger the release process now.
  }
}
