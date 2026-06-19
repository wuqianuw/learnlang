export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  streaming?: boolean;
  error?: boolean;
  timestamp: number;
}

export interface ApiHistoryMessage {
  role: MessageRole;
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "image"; url: string }>;
}
