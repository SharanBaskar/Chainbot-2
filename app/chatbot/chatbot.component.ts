import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CouchdbService } from '../couchdb.service';
import { GeminiService } from './gemini.service';  // Updated import

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

interface Answer {
  text: string;
  next: string;
}

interface Node {
  type: string;
  text: string;
  answers?: Answer[];
  next?: string;
}

interface DecisionTree {
  startNode: string;
  nodes: { [key: string]: Node };
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  decisionTree: DecisionTree = { startNode: '', nodes: {} };
  currentNode: Node = { type: '', text: '' };
  conversation: { speaker: string; text: string }[] = [];
  userInput = '';
  errorMessage = '';
  isMinimized = true;
  leaveDetails: any = {};
  leaveBalance = 0;

  @ViewChild('chatContent') private chatContent!: ElementRef;

  constructor(
    private couchdbService: CouchdbService,
    private http: HttpClient,
    private geminiService: GeminiService  // Updated service
  ) {}

  ngOnInit(): void {
    this.couchdbService.getDecisionTree().subscribe(data => {
      this.decisionTree = data.data;
      this.currentNode = this.decisionTree.nodes[this.decisionTree.startNode];
      this.addMessage('bot', this.currentNode.text);
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  addMessage(speaker: string, text: string): void {
    this.conversation.push({ speaker, text });
    this.scrollToBottom();
  }

  selectAnswer(answer: Answer): void {
    this.addMessage('user', answer.text);

    // Check for redirection conditions
    if (this.currentNode.text === "Welcome to our Ticket service!") {
      if (answer.text === 'Raise Ticket' || answer.text === 'Ticket Status') {
        window.open('https://e.chain.portal.url', '_blank');
      }
    } else if (this.currentNode.text === "Welcome to our Technical service!") {
      if (answer.text === 'Raise Support') {
        window.open('https://appTrack.portal.url', '_blank');
      }
    }

    if (this.currentNode.text === "Are you sure you want to submit the form?") {
      if (answer.text === 'Yes, submit') {
        this.sendLeaveApplicationEmail();
        return;
      }
    }
    
    this.currentNode = this.decisionTree.nodes[answer.next];
    this.processNode();
  }

  submitInput(): void {
    if (!this.userInput.trim()) {
      this.displayErrorMessage('Please enter a value');
      return;
    }

    // Validate email and date inputs
    if (this.currentNode.text === "Enter your Email ID" || this.currentNode.text === "Enter manager Email ID") {
      if (!this.validateEmail(this.userInput)) {
        this.displayErrorMessage('Please enter a valid email ID');
        return;
      }
    }

    if (this.currentNode.text === "Please provide the start date for your leave. (Format: YYYY-MM-DD)" || this.currentNode.text === "Please provide the end date for your leave. (Format: YYYY-MM-DD)") {
      if (!this.validateDate(this.userInput)) {
        this.displayErrorMessage('Please enter a valid date in the format YYYY-MM-DD');
        return;
      }

      if (new Date(this.userInput) <= new Date()) {
        this.displayErrorMessage('Please enter a date greater than today\'s date');
        return;
      }
    }

    this.addMessage('user', this.userInput);
    this.errorMessage = '';
    this.leaveDetails[this.currentNode.text] = this.userInput;

    if (this.currentNode.text === "Please provide your employee ID") {
      this.checkEmployeeEligibility(this.userInput);
    } else {
      this.processUserInput(this.userInput);
    }

    this.userInput = '';
  }

  async processUserInput(input: string): Promise<void> {
    // Map user input to the next node based on predefined keywords or phrases
    let nextNode = this.currentNode.next;

    const keywordMappings: { [key: string]: string } = {
      "apply for leave": "node2", "apply for lave": "node2", "apply for leve": "node2",
      "check balance": "node2", "check balnce": "node2", "check blance": "node2", "check balane": "node2", "check balanc": "node2",
      "ticket": "node16", "tcket": "node16", "tiket": "node16", "ticet": "node16", "tickt": "node16", "ticke": "node16", "icket": "node16",
      "tick": "node16", "tikcet": "node16", "tikeet": "node16", "ticcket": "node16", "ticetk": "node16", "ticekt": "node16",
      "technical": "node18", "echnical": "node18", "tchnical": "node18", "tehnical": "node18", "tecnical": "node18", "techical": "node18",
      "techncal": "node18", "technial": "node18", "technicl": "node18", "technica": "node18", "teachnical": "node18",
      "tecical": "node18", "techncl": "node18", "tecnhical": "node18", "tehcnical": "node18", "techincal": "node18", "tecchnical": "node18",
      "tehc": "node18", "tecni": "node18", "technicaly": "node18", "techniacl": "node18", "technialc": "node18",
      "hello": "node1", "hey": "node1", "hiya": "node1", "hii": "node1",
      "your name" : "node1", "developed you": "node20","develped": "node20"
    };

    for (const keyword in keywordMappings) {
      if (input.toLowerCase().includes(keyword)) {
        nextNode = keywordMappings[keyword];
        break;
      }
    }

    if (!nextNode) {
      try {
        const suggestion = await this.geminiService.generateText(input);  // Use GeminiService
        this.addMessage('bot', suggestion);
      } catch (error) {
        console.error('Error getting response from Gemini:', error);
        this.addMessage('bot', "I’m having trouble understanding your request. Could you please provide more details?");
      }
    } else {
      this.currentNode = this.decisionTree.nodes[nextNode || ''];
      this.processNode();
    }
  }

  validateEmail(email: string): boolean {
    const emailPattern = /^[a-zA-Z]+\.[a-zA-Z]+@chainsys\.com$/;
    return emailPattern.test(email);
  }

  validateDate(date: string): boolean {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    return datePattern.test(date);
  }

  checkEmployeeEligibility(employeeId: string): void {
    const url = `https://192.168.57.185:5984/employee-db/${employeeId}`;
    const headers = new HttpHeaders({
      'Authorization': 'Basic ' + btoa('d_couchdb:Welcome#2')
    });

    this.http.get<any>(url, { headers }).subscribe(
      data => {
        data.leaveBalance = data.leaveBalance || 0;
        this.leaveBalance = data.leaveBalance;
        this.leaveDetails['leaveBalance'] = this.leaveBalance;

        if (this.leaveBalance > 0) {
          this.currentNode = this.decisionTree.nodes['nodeEligibilityResult'];
        } else {
          this.addMessage('bot', 'You are not eligible to apply for leave.');
          this.currentNode = this.decisionTree.nodes[this.decisionTree.startNode];
        }
        this.processNode();
      },
      error => {
        this.addMessage('bot', 'No record found.');
        this.currentNode = this.decisionTree.nodes[this.decisionTree.startNode];
        this.processNode();
      }
    );
  }

  processNode(): void {
    if (!this.currentNode) {
      console.error('Invalid node configuration');
      return;
    }

    if (this.currentNode.type === 'question' && this.currentNode.text === 'No. of days') {
      const maxDays = Math.min(this.leaveBalance, 5);
      this.currentNode.answers = this.currentNode.answers?.filter(answer => parseInt(answer.text, 10) <= maxDays);
    }

    const botMessage = this.replaceVariables(this.currentNode.text);
    this.addMessage('bot', botMessage);
  }

  replaceVariables(text: string): string {
    return text.replace(/\[\w+\]/g, match => this.leaveDetails[match.slice(1, -1)] || match);
  }

 
toggleMinimize(event?: Event): void {
  if (event) {
    event.stopPropagation();
  }
  this.isMinimized = !this.isMinimized;
}

closeChat(event?: Event): void {
  const confirmClose = confirm("Are you sure you want to close the chat?");
  if (event) {
    event.stopPropagation();
  }
  this.isMinimized = !this.isMinimized;
}

private scrollToBottom(): void {
  try {
    this.chatContent.nativeElement.scrollTop = this.chatContent.nativeElement.scrollHeight;
  } catch (err) {
    console.error('Scroll to bottom failed:', err);
  }
}

displayErrorMessage(message: string): void {
  this.errorMessage = message;
  setTimeout(() => {
    this.errorMessage = '';
  }, 2000);
}
  sendLeaveApplicationEmail(): void {
    const templateParams = {
      employee_email: this.leaveDetails['Enter your Email ID'],
      manager_email: this.leaveDetails['Enter manager Email ID'],
      employee_id: this.leaveDetails['Please provide your employee ID'],
      leave_type: this.leaveDetails['Type of leave'],
      leave_reason: this.leaveDetails['Reason for the leave'],
      leave_days: this.leaveDetails['No. of days'],
      start_date: this.leaveDetails['Please provide the start date for your leave. (Format: YYYY-MM-DD)'],
      end_date: this.leaveDetails['Please provide the end date for your leave. (Format: YYYY-MM-DD)']
    };

    emailjs.send('service_xtcg508', 'template_ky3ydpp', templateParams, 'QVAF5IuB_-FAI3Hzm')
      .then((response: EmailJSResponseStatus) => {
        console.log('SUCCESS!', response.status, response.text);
        this.updateLeaveBalance(this.leaveDetails['Please provide your employee ID'], this.leaveDetails['No. of days']);
      }, (error) => {
        console.error('FAILED...', error);
      });
  }

  updateLeaveBalance(employeeId: string, leaveDays: string): void {
    const url = `https://192.168.57.185:5984/employee-db/${employeeId}`;
    const headers = new HttpHeaders({
      'Authorization': 'Basic ' + btoa('d_couchdb:Welcome#2'),
      'Content-Type': 'application/json'
    });
  
    this.http.get<any>(url, { headers }).subscribe(
      data => {
        if (data.leaveBalance >= parseInt(leaveDays, 10)) {
          data.leaveBalance -= parseInt(leaveDays, 10);
  
          // Add leave details to the employee document
          if (!data.leaveDetails) {
            data.leaveDetails = [];
          }
          
          data.leaveDetails.push({
            leaveType: this.leaveDetails['Type of leave'],
            leaveReason: this.leaveDetails['Reason for the leave'],
            startDate: this.leaveDetails['Please provide the start date for your leave. (Format: YYYY-MM-DD)'],
            endDate: this.leaveDetails['Please provide the end date for your leave. (Format: YYYY-MM-DD)'],
            leaveDays: this.leaveDetails['No. of days'],
            dateRequested: new Date().toISOString()  // Current date and time
          });
  
          this.http.put(url, data, { headers }).subscribe(
            () => {
              console.log('Leave balance and details updated successfully.');
              this.currentNode = this.decisionTree.nodes['node21'];
              this.processNode();
            },
            error => {
              console.error('Error updating leave balance and details:', error);
            }
          );
        } else {
          this.addMessage('bot', 'Insufficient leave balance.');
          this.currentNode = this.decisionTree.nodes[this.decisionTree.startNode];
          this.processNode();
        }
      },
      error => {
        console.error('Error fetching employee data:', error);
        this.addMessage('bot', 'Failed to retrieve employee data.');
        this.currentNode = this.decisionTree.nodes[this.decisionTree.startNode];
        this.processNode();
      }
    );
  }
  
}

