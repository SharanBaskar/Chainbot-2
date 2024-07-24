import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {

  private generativeAI: GoogleGenerativeAI;
  private messageHistory: BehaviorSubject<any> = new BehaviorSubject(null);

  constructor() {
    this.generativeAI = new GoogleGenerativeAI('AIzaSyA-v_S2LjvRdyh1GAM9lyqBnp6qQ3dtf3c');
  }

  async generateText(prompt: string): Promise<string> {
    const model = this.generativeAI.getGenerativeModel({ model: 'gemini-pro' });
    this.messageHistory.next({
      from: 'user',
      message: prompt
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
    this.messageHistory.next({
      from: 'bot',
      message: text
    });

    return text;
  }

  public getMessageHistory(): Observable<any> {
    return this.messageHistory.asObservable();
  }
}
