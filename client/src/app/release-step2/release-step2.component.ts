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

  onFinish(): void {
    if (!this.state.selectedBranch.trim()) {
      this.toastService.showToast('Error', 'Please select a branch.');
      return;
    }
    this.finish.emit({ selectedBranch: this.state.selectedBranch });
  }

  onBack(): void {
    this.back.emit();
  }
}
