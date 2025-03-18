import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReleaseService {
  private apiUrl = 'http://localhost:3000/api/credentials';
  targetBranch: string = '';
  mode: 'workitem' | 'manual' = 'workitem';
  workItemId: string = '';
  mBranchesStr: string = '';
  manualBranches: string[] = [];
  computedBranches: string[] = [];
  branchMapping: { [branch: string]: string } = {};
  wiToBranch: { [wi: string]: string[] } = {};
  selectedBranch: string = '';
  credentialId: string = '';

  constructor(private http: HttpClient) {}

  getCredentials(): Observable<Credential[]> {
    return this.http.get<Credential[]>(this.apiUrl);
  }

  reset(): void {
    this.targetBranch = '';
    this.mode = 'workitem';
    this.workItemId = '';
    this.manualBranches = [];
    this.computedBranches = [];
    this.branchMapping = {};
    this.wiToBranch = {};
    this.selectedBranch = '';
  }
}
