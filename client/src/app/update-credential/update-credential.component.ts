// src/app/update-credential/update-credential.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CredentialService } from '../credential.service';
import { ToastService } from '../toast.service';

@Component({
    selector: 'app-update-credential',
    templateUrl: './update-credential.component.html',
    styleUrls: ['./update-credential.component.css'],
    standalone: false
})
export class UpdateCredentialComponent implements OnInit {
  id!: number;
  newPat = '';

  constructor(
    private route: ActivatedRoute,
    private credentialService: CredentialService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
  }

  updateCredential(): void {
    this.credentialService.updateCredential(this.id, this.newPat).subscribe({
      next: res => {
        this.toastService.showToast('Success', res.message);
        this.router.navigate(['/list']);
      },
      error: err => {
        this.toastService.showToast('Error', 'Error updating credential');
        console.error(err);
      }
    });
  }
}
