import type { ApiHistoryMessage } from "@/types/chat";

export const API_BASE_URL = "";

interface PresignResponse {
  uploadUrl: string;
  accessUrl: string;
  contentType: string;
}

interface StreamChatArgs {
  message: string;
  imageUrl?: string;
  threadId: string;
  onChunk: (chunk: string) => void;
}

function generatedFilename(file: File): string {
  const extension = file.name.split(".").pop() || "jpg";
  return `${Date.now()}.${extension}`;
}

export async function uploadImage(file: File): Promise<string> {
  const filename = generatedFilename(file);
  const presignResponse = await fetch(
    `${API_BASE_URL}/api/v1/oss/presign?filename=${encodeURIComponent(filename)}`,
  );

  if (!presignResponse.ok) {
    throw new Error("获取上传 URL 失败");
  }

  const { uploadUrl, accessUrl, contentType } =
    (await presignResponse.json()) as PresignResponse;
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`图片上传失败: ${uploadResponse.status}`);
  }

  return accessUrl;
}

export async function streamChat({
  message,
  imageUrl,
  threadId,
  onChunk,
}: StreamChatArgs): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      image_url: imageUrl,
      thread_id: threadId,
    }),
  });

  if (!response.ok) {
    throw new Error("请求失败");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取响应流");
  }

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      const finalChunk = decoder.decode();
      if (finalChunk) {
        onChunk(finalChunk);
      }
      return;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      onChunk(chunk);
    }
  }
}

export async function getChatMessages(
  threadId: string,
): Promise<ApiHistoryMessage[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/chat/messages?thread_id=${encodeURIComponent(threadId)}`,
  );

  if (!response.ok) {
    throw new Error("获取历史消息失败");
  }

  const data = (await response.json()) as { messages: ApiHistoryMessage[] };
  return data.messages;
}

export async function clearChatMessages(threadId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/chat/messages?thread_id=${encodeURIComponent(threadId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    throw new Error("清空历史消息失败");
  }
}
