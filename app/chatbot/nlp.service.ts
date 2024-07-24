import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NlpService {

  private apiUrl = 'https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct/tree/main'; // Replace with your Hugging Face model endpoint
  private accessToken = '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'; // Replace with your Hugging Face access token

  constructor(private http: HttpClient) {}

  processInput(input: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.accessToken}`
    });

    return this.http.post<any>(this.apiUrl, { inputs: input }, { headers });
  }
}
