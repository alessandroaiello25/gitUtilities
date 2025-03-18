// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CredentialListComponent } from './credential-list/credential-list.component';
import { InsertCredentialComponent } from './insert-credential/insert-credential.component';
import { UpdateCredentialComponent } from './update-credential/update-credential.component';
import { ReleaseProcessComponent } from './release-process/release-process.component';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: CredentialListComponent },
  { path: 'insert', component: InsertCredentialComponent },
  { path: 'update/:id', component: UpdateCredentialComponent },
  { path: 'release-process/:id', component: ReleaseProcessComponent },
  { path: '**', redirectTo: 'list' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
