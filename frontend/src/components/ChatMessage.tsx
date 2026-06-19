import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatMessage as ChatMessageType } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

function safeHref(href: string | undefined): string | undefined {
  if (!href) {
    return undefined;
  }

  if (
    href.startsWith("#") ||
    href.startsWith("/") ||
    /^(https?:|mailto:)/i.test(href)
  ) {
    return href;
  }

  return undefined;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <article
      className={[
        "chat-message",
        isUser ? "chat-message--user" : "chat-message--assistant",
        message.error ? "chat-message--error" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!isUser ? (
        <div aria-hidden="true" className="chat-message__avatar">
          AI
        </div>
      ) : null}

      <div className="chat-message__body">
        {!isUser ? <span className="chat-message__author">ATELIER AI</span> : null}

        {message.imageUrl ? (
          <img
            alt="用户上传的穿搭"
            className="chat-message__image"
            src={message.imageUrl}
          />
        ) : null}

        {message.content ? (
          isUser ? (
            <p className="chat-message__text">{message.content}</p>
          ) : (
            <div className="markdown">
              <ReactMarkdown
                components={{
                  a: ({ href, children, ...props }) => {
                    const sanitizedHref = safeHref(href);
                    const external = sanitizedHref?.startsWith("http");
                    return (
                      <a
                        {...props}
                        href={sanitizedHref}
                        rel={external ? "noreferrer noopener" : undefined}
                        target={external ? "_blank" : undefined}
                      >
                        {children}
                      </a>
                    );
                  },
                  table: ({ children, ...props }) => (
                    <div className="markdown__table-scroll">
                      <table {...props}>{children}</table>
                    </div>
                  ),
                }}
                remarkPlugins={[remarkGfm]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )
        ) : null}

        {message.streaming ? (
          <span className="streaming-status" role="status">
            <span aria-hidden="true" className="streaming-status__dot" />
            正在思考搭配建议…
          </span>
        ) : null}

        {message.error ? (
          <span className="sr-only" role="alert">
            {message.content}
          </span>
        ) : null}
      </div>
    </article>
  );
}
