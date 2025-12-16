export interface ToolCall {
  toolCallId: string;
  name: string;
  args: any;
  result?: any;
  state: 'calling' | 'result' | 'error';
}

export interface Message {
  role: "user" | "model";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}
