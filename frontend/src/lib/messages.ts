import type { ApiHistoryMessage, ChatMessage } from "@/types/chat";

export function toChatMessages(
  history: ApiHistoryMessage[],
): ChatMessage[] {
  const now = Date.now();

  return history.map((message, index) => {
    const contentParts =
      typeof message.content === "string" ? [] : message.content;
    const content =
      typeof message.content === "string"
        ? message.content
        : contentParts
            .filter(
              (part): part is { type: "text"; text: string } =>
                part.type === "text",
            )
            .map((part) => part.text)
            .join("");
    const imageUrl = contentParts.find(
      (part): part is { type: "image"; url: string } => part.type === "image",
    )?.url;

    return {
      id: `history-${index}-${now}`,
      role: message.role,
      content,
      ...(imageUrl ? { imageUrl } : {}),
      timestamp: now - (history.length - index) * 1_000,
    };
  });
}
