import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  API_BASE_URL,
  clearChatMessages,
  getChatMessages,
  streamChat,
  uploadImage,
} from "@/lib/api";
import { toChatMessages } from "@/lib/messages";
import {
  THREAD_STORAGE_KEY,
  getOrCreateThreadId,
  replaceThreadId,
} from "@/lib/session";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(data: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the exact backend base URL", () => {
    expect(API_BASE_URL).toBe("");
  });

  it("encodes the generated filename, uploads the original File, and returns accessUrl", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_750_000_000_000);
    const file = new File(["image bytes"], "outfit.jp g", {
      type: "image/jpeg",
    });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          uploadUrl: "https://upload.example/object",
          accessUrl: "https://cdn.example/object",
          contentType: "image/custom-jpeg",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(uploadImage(file)).resolves.toBe(
      "https://cdn.example/object",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_BASE_URL}/api/v1/oss/presign?filename=1750000000000.jp%20g`,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://upload.example/object",
      {
        method: "PUT",
        headers: { "Content-Type": "image/custom-jpeg" },
        body: file,
      },
    );
  });

  it("posts the strict chat JSON contract and decodes every stream chunk", async () => {
    const encoder = new TextEncoder();
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode("第一块"),
      })
      .mockResolvedValueOnce({
        done: false,
        value: encoder.encode("第二块"),
      })
      .mockResolvedValueOnce({ done: true, value: undefined });
    const getReader = vi.fn(() => ({ read }));
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: { getReader },
    } as unknown as Response);
    const onChunk = vi.fn();

    await streamChat({
      message: "帮我搭配",
      imageUrl: "https://cdn.example/look.jpg",
      threadId: "thread-1",
      onChunk,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/chat/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "帮我搭配",
          image_url: "https://cdn.example/look.jpg",
          thread_id: "thread-1",
        }),
      },
    );
    expect(getReader).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledTimes(3);
    expect(onChunk.mock.calls).toEqual([["第一块"], ["第二块"]]);
  });

  it("reports a readable error when the chat response has no body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: null,
    } as Response);

    await expect(
      streamChat({
        message: "hello",
        threadId: "thread-1",
        onChunk: vi.fn(),
      }),
    ).rejects.toThrow("无法读取响应流");
  });

  it("throws when an API response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));

    await expect(getChatMessages("thread-1")).rejects.toThrow(
      "获取历史消息失败",
    );
  });

  it("returns the messages field from history", async () => {
    const messages = [{ role: "assistant" as const, content: "历史回复" }];
    fetchMock.mockResolvedValueOnce(jsonResponse({ messages }));

    await expect(getChatMessages("thread / 1")).resolves.toEqual(messages);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/chat/messages?thread_id=thread%20%2F%201`,
    );
  });

  it("clears history with DELETE", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    await clearChatMessages("thread-1");

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/chat/messages?thread_id=thread-1`,
      { method: "DELETE" },
    );
  });
});

describe("session helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores one thread id and replaces it on demand", () => {
    expect(THREAD_STORAGE_KEY).toBe("thread_id");

    const first = getOrCreateThreadId();
    expect(first).toBeTruthy();
    expect(getOrCreateThreadId()).toBe(first);
    expect(localStorage.getItem(THREAD_STORAGE_KEY)).toBe(first);

    const replacement = replaceThreadId();
    expect(replacement).toBeTruthy();
    expect(replacement).not.toBe(first);
    expect(localStorage.getItem(THREAD_STORAGE_KEY)).toBe(replacement);
  });
});

describe("history conversion", () => {
  it("converts string and text/image array content into ChatMessage values", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);

    expect(
      toChatMessages([
        { role: "user", content: "文字消息" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "搭配建议" },
            { type: "image", url: "https://cdn.example/result.jpg" },
          ],
        },
      ]),
    ).toEqual([
      {
        id: "history-0-10000",
        role: "user",
        content: "文字消息",
        timestamp: 8_000,
      },
      {
        id: "history-1-10000",
        role: "assistant",
        content: "搭配建议",
        imageUrl: "https://cdn.example/result.jpg",
        timestamp: 9_000,
      },
    ]);
  });
});
