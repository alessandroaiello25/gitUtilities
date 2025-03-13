// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CredentialListComponent } from './credential-list/credential-list.component';
import { InsertCredentialComponent } from './insert-credential/insert-credential.component';
import { UpdateCredentialComponent } from './update-credential/update-credential.component';
import { ReleaseStep1Component } from './release-step1/release-step1.component';
import { ReleaseStep2Component } from './release-step2/release-step2.component';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: CredentialListComponent },
  { path: 'insert', component: InsertCredentialComponent },
  { path: 'update/:id', component: UpdateCredentialComponent },
  { path: 'start-release/step1', component: ReleaseStep1Component },
  { path: 'start-release/step2', component: ReleaseStep2Component },
  { path: '**', redirectTo: 'list' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
