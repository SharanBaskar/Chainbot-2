import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {

  private generativeAI: GoogleGenerativeAI;
  private messageHistory: BehaviorSubject<any> = new BehaviorSubject(null);

  constructor() {
    this.generativeAI = new GoogleGenerativeAI('Your_API_KEY');
  }

  async generateText(prompt: string): Promise<string> {
    const model = this.generativeAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.messageHistory.next({
      from: 'user',
      message: prompt
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Remove '**' for bold formatting
    text = text.replace(/\*\*/g, '');

    // Add line breaks or bullet points for each point in the response
    text = text.replace(/\d\.\s/g, '\n* '); // Add bullet points for numbered lists
    text = text.replace(/Tips for Effective Bug Reporting:/, '\nTips for Effective Bug Reporting:\n* ');
    text = text.replace(/\*\s/g, '\n* '); // Add bullet points for other points

    // Truncate the text to keep it short and sweet
    text = text.split('\n').slice(0, 10).join('\n'); // Limit to first 5 lines

    console.log(text);
    this.messageHistory.next({
      from: 'bot',
      message: text
    });

    return text;
  }

  public getMessageHistory() {
    return this.messageHistory.asObservable();
  }
}
