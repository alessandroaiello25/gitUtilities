// src/app/app.module.ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';           // For ngModel
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module'; // Routing
import { AppComponent } from './app.component';
import { InsertCredentialComponent } from './insert-credential/insert-credential.component';
import { CredentialListComponent } from './credential-list/credential-list.component';
import { UpdateCredentialComponent } from './update-credential/update-credential.component';
import { ReleaseStep1Component } from './release-step1/release-step1.component';
import { ReleaseStep2Component } from './release-step2/release-step2.component';
import { ReleaseProcessComponent } from './release-process/release-process.component';

@NgModule({
  declarations: [
    AppComponent,
    InsertCredentialComponent,
    CredentialListComponent,
    UpdateCredentialComponent,
    ReleaseStep1Component,
    ReleaseStep2Component,
    ReleaseProcessComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,          // Required for ngModel
    HttpClientModule,     // Required for HTTP
    AppRoutingModule      // Provides routerLink, router-outlet
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
