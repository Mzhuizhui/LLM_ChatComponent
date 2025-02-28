export interface FileInfo {
  id: string;
  name: string;
  type: 'image' | 'file';
  previewUrl: string;
  url?:string;
  cozeFileId?: string; // 上传后获得的文件ID
  cozeFileName?:string;// 上传后获得的文件名字
  raw:File;
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image' | 'file'; file_id: string,name:string,url?:string };


export interface Message {
  id: string;
  role: 'user' | 'assistant';
  backcontent: string; //回复内容
  parsedContent: string; //渲染之后的html内容
  contents: MessageContent[]; // 用户输入内容
  isStreaming?: boolean;//是否为流式数据
  conversationId: string;
  timestamp?: number;
  processedContent?:string;
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
}

export type WSMessage =
  | { type: 'chunk'; messageId: string; content: string; conversationId: string }
  | { type: 'complete'; messageId: string; conversationId: string; fullContent: string }
  | { type: 'error'; message: string };

