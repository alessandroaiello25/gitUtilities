import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
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

  // This object will store the user's selection for each ambiguous work item.
  // Key: work item id, Value: selected branch name.
  ambiguousSelections: { [wi: string]: string } = {};

  // The final computed branches (after disambiguation) to be presented as checkboxes.
  finalBranches: string[] = [];
  // The final selected branches (from checkboxes).
  finalSelectedBranches: string[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    // Initialize ambiguousSelections for each work item in wiToBranch that has more than one branch.
    if (this.state.wiToBranch) {
      for (const wi in this.state.wiToBranch) {
        const branches = this.state.wiToBranch[wi];
        if (branches.length > 1) {
          // Default to the first branch if no selection made yet.
          this.ambiguousSelections[wi] = branches[0];
        }
      }
    }
    // Compute the final branches based on the mappings.
    this.computeFinalBranches();
  }

  /**
   * Recompute the final branches by going through each work item in the mapping.
   * For ambiguous WIs, use the branch from ambiguousSelections.
   * For unambiguous WIs, use the sole branch.
   * Also include any branches that are not associated with a WI mapping.
   */
  computeFinalBranches(): void {
    const finalSet = new Set<string>();
    // Process each WI in the mapping.
    if (this.state.wiToBranch) {
      for (const wi in this.state.wiToBranch) {
        const branches = this.state.wiToBranch[wi];
        if (branches.length === 1) {
          finalSet.add(branches[0]);
        } else if (branches.length > 1) {
          const chosen = this.ambiguousSelections[wi] || branches[0];
          finalSet.add(chosen);
        }
      }
    }
    // Also include any branches from the overall computedBranches that might not be in a WI mapping.
    if (this.state.computedBranches) {
      this.state.computedBranches.forEach(b => finalSet.add(b));
    }
    this.finalBranches = Array.from(finalSet);
    // By default, all final branches are selected.
    this.finalSelectedBranches = [...this.finalBranches];
  }

  // Called when the user changes the selection for an ambiguous work item.
  onAmbiguousChange(wi: string, branch: string): void {
    this.ambiguousSelections[wi] = branch;
    this.computeFinalBranches();
  }

  // Called when a checkbox for a final branch is toggled.
  toggleFinalSelection(branch: string, event: any): void {
    if (event.target.checked) {
      if (!this.finalSelectedBranches.includes(branch)) {
        this.finalSelectedBranches.push(branch);
      }
    } else {
      this.finalSelectedBranches = this.finalSelectedBranches.filter(b => b !== branch);
    }
  }

  onFinish(): void {
    if (!this.finalSelectedBranches || this.finalSelectedBranches.length === 0) {
      this.toastService.showToast('Error', 'Please select at least one branch.');
      return;
    }
    // Emit final selected branches.
    this.finish.emit({ selectedBranches: this.finalSelectedBranches });
  }

  onBack(): void {
    this.finish.emit({}); // Optionally, you can send the current selection before going back.
    this.back.emit();
  }
}
