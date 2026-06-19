"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessage } from "@/components/ChatMessage";
import { EmptyState } from "@/components/EmptyState";
import { LoginModal } from "@/components/LoginModal";
import { SiteHeader } from "@/components/SiteHeader";
import {
  clearChatMessages,
  getChatMessages,
  streamChat,
  uploadImage,
} from "@/lib/api";
import { toChatMessages } from "@/lib/messages";
import { getOrCreateThreadId, replaceThreadId } from "@/lib/session";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

const IMAGE_ONLY_PROMPT = "请分析这套穿搭，并给出具体的搭配建议。";
const SEND_ERROR = "暂时无法获得穿搭建议，请稍后再试。";

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatShell() {
  const [threadId, setThreadId] = useState(() => getOrCreateThreadId());
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    getChatMessages(threadId)
      .then((history) => {
        if (active) {
          setMessages(toChatMessages(history));
        }
      })
      .catch(() => {
        if (active) {
          setMessages([]);
        }
      });

    return () => {
      active = false;
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const handlePromptSelect = useCallback((prompt: string) => {
    setDraft(prompt);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedDraft = draft.trim();
    const file = selectedFile;
    if ((!trimmedDraft && !file) || isSending) {
      return;
    }

    const content = trimmedDraft || IMAGE_ONLY_PROMPT;
    const userId = messageId("user");
    const assistantId = messageId("assistant");
    let assistantAdded = false;

    setIsSending(true);

    try {
      const imageUrl = file ? await uploadImage(file) : undefined;
      const now = Date.now();
      const userMessage: ChatMessageType = {
        id: userId,
        role: "user",
        content,
        ...(imageUrl ? { imageUrl } : {}),
        timestamp: now,
      };
      const assistantMessage: ChatMessageType = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        timestamp: now + 1,
      };

      setMessages((current) => [
        ...current,
        userMessage,
        assistantMessage,
      ]);
      assistantAdded = true;
      setDraft("");
      setSelectedFile(null);

      await streamChat({
        message: content,
        imageUrl,
        threadId,
        onChunk: (chunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + chunk }
                : message,
            ),
          );
        },
      });

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, streaming: false }
            : message,
        ),
      );
    } catch {
      const errorMessage: ChatMessageType = {
        id: assistantId,
        role: "assistant",
        content: SEND_ERROR,
        error: true,
        streaming: false,
        timestamp: Date.now(),
      };

      setMessages((current) =>
        assistantAdded
          ? current.map((message) =>
              message.id === assistantId ? errorMessage : message,
            )
          : [...current, errorMessage],
      );
    } finally {
      setIsSending(false);
    }
  }, [draft, isSending, selectedFile, threadId]);

  const handleNewConversation = useCallback(async () => {
    if (isResetting || isSending) {
      return;
    }

    setIsResetting(true);
    try {
      await clearChatMessages(threadId);
      const nextThreadId = replaceThreadId();
      setThreadId(nextThreadId);
      setMessages([]);
      setDraft("");
      setSelectedFile(null);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: messageId("reset-error"),
          role: "assistant",
          content: "暂时无法新建会话，请稍后再试。",
          error: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, isSending, threadId]);

  return (
    <main className="chat-shell">
      <SiteHeader
        disabled={isSending || isResetting}
        nickname={nickname}
        onLogin={() => setLoginOpen(true)}
        onNewConversation={handleNewConversation}
      />

      <div className="chat-shell__workspace">
        <section
          aria-label="穿搭对话"
          aria-live="polite"
          className="chat-shell__conversation"
        >
          {messages.length === 0 ? (
            <EmptyState
              onPromptSelect={handlePromptSelect}
              onUpload={() => fileInputRef.current?.click()}
            />
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div aria-hidden="true" ref={bottomRef} />
            </div>
          )}
        </section>

        <ChatComposer
          disabled={isSending}
          fileInputRef={fileInputRef}
          onSelectedFileChange={setSelectedFile}
          onSend={handleSend}
          onValueChange={setDraft}
          selectedFile={selectedFile}
          value={draft}
        />
      </div>

      <LoginModal
        onClose={() => setLoginOpen(false)}
        onLogin={setNickname}
        open={loginOpen}
      />
    </main>
  );
}
