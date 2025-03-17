// src/app/app.module.ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';           // For ngModel
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module'; // Routing
import { AppComponent } from './app.component';
import { InsertCredentialComponent } from './insert-credential/insert-credential.component';
import { CredentialListComponent } from './credential-list/credential-list.component';
import { UpdateCredentialComponent } from './update-credential/update-credential.component';

@NgModule({ declarations: [
        AppComponent,
        InsertCredentialComponent,
        CredentialListComponent,
        UpdateCredentialComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        FormsModule, // Required for HTTP
        AppRoutingModule // Provides routerLink, router-outlet
    ], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class AppModule { }
