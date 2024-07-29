import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

interface DecisionTree {
  startNode: string;
  nodes: { [key: string]: Node };
}

interface Node {
  type: string;
  text: string;
  answers?: Answer[];
  next?: string;
}

interface Answer {
  text: string;
  next: string;
}

@Injectable({
  providedIn: 'root'
})
export class CouchdbService {
  private dbUrl = 'YOUR_URL/decison-tree-db/decisiontree_3';
  private username = ''; // Replace with your CouchDB username
  private password = ''; // Replace with your CouchDB password

  constructor(private http: HttpClient) { }

  getDecisionTree(): Observable<{ data: DecisionTree }> {
    const headers = new HttpHeaders({
      'Authorization': 'Basic ' + btoa(this.username + ':' + this.password)
    });

    return this.http.get<{ data: DecisionTree }>(this.dbUrl, { headers });
  }
}
