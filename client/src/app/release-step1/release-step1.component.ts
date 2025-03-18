import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReleaseState } from '../release-process/release-process.component';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-release-step1',
  templateUrl: './release-step1.component.html',
  styleUrls: ['./release-step1.component.css'],
  standalone: false
})
export class ReleaseStep1Component {
  @Input() state!: ReleaseState;
  @Output() nextStep = new EventEmitter<Partial<ReleaseState>>();

  constructor(private toastService: ToastService) {}

  // Called when the user clicks "Next"
  proceed(): void {
    // Basic validations could be performed here as well.
    if (!this.state.targetBranch.trim()) {
      this.toastService.showToast('Error', 'Target branch is required.');
      return;
    }
    if (this.state.mode === 'workitem' && !this.state.workItemId.trim()) {
      this.toastService.showToast('Error', 'Work item ID is required.');
      return;
    }
    if (this.state.mode === 'manual' && !this.state.manualBranches.trim()) {
      this.toastService.showToast('Error', 'Please enter branch names.');
      return;
    }
    // Emit the collected state to the parent.
    this.nextStep.emit(this.state);
  }
}
