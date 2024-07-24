import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HuggingFaceService {
  private apiUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
  private apiKey = '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'; // Replace with your API key

  constructor(private http: HttpClient) {}

  getEmbeddings(text: string): Observable<number[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<number[]>(this.apiUrl, { inputs: text }, { headers });
  }
}
