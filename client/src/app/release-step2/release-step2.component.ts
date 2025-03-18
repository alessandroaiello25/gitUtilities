import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReleaseState } from '../release-process/release-process.component';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-release-step2',
  templateUrl: './release-step2.component.html',
  styleUrls: ['./release-step2.component.css'],
  standalone: false
})
export class ReleaseStep2Component {
  @Input() state!: ReleaseState;
  @Output() back = new EventEmitter<void>();
  @Output() finish = new EventEmitter<Partial<ReleaseState>>();

  constructor(private toastService: ToastService) {}

  // Toggle branch selection in the selectedBranches array.
  toggleSelection(branch: string, event: any): void {
    if (event.target.checked) {
      // Add branch if not already selected.
      if (!this.state.selectedBranches.includes(branch)) {
        this.state.selectedBranches.push(branch);
      }
    } else {
      // Remove branch.
      this.state.selectedBranches = this.state.selectedBranches.filter(b => b !== branch);
    }
  }

  onFinish(): void {
    if (!this.state.selectedBranches || this.state.selectedBranches.length === 0) {
      this.toastService.showToast('Error', 'Please select at least one branch.');
      return;
    }
    this.finish.emit({ selectedBranches: this.state.selectedBranches });
  }

  onBack(): void {
    this.back.emit();
  }
}
