// src/app/credential.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Credential {
  id: number;
  azure_org_url: string;
  project: string;
  repository: string;
  project_path: string;
  active: number;
  // New field for local Salesforce Project Path
  // decrypted_pat is not sent to the client
}

@Injectable({
  providedIn: 'root'
})
export class CredentialService {
  private apiUrl = 'http://localhost:3000/api/credentials';

  constructor(private http: HttpClient) {}

  getCredentials(): Observable<Credential[]> {
    return this.http.get<Credential[]>(this.apiUrl);
  }

  insertCredential(credential: {
    azure_org_url: string;
    project: string;
    repository: string;
    project_path: string;
    pat: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, credential);
  }

  updateCredential(id: number, pat: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, { pat });
  }

  deleteCredential(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  activateCredential(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/active`, {id: id})
  }
}
