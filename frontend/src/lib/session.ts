export const THREAD_STORAGE_KEY = "thread_id";

function fallbackThreadId(): string {
  return "10000000-1000-4000-8000-100000000000".replace(
    /[018]/g,
    (character) =>
      (
        Number(character) ^
        ((Math.random() * 16) >> (Number(character) / 4))
      ).toString(16),
  );
}

export function createThreadId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return fallbackThreadId();
}

export function getOrCreateThreadId(): string {
  if (typeof window === "undefined") {
    return createThreadId();
  }

  const existingThreadId = window.localStorage.getItem(THREAD_STORAGE_KEY);
  if (existingThreadId) {
    return existingThreadId;
  }

  return replaceThreadId();
}

export function replaceThreadId(): string {
  const threadId = createThreadId();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THREAD_STORAGE_KEY, threadId);
  }

  return threadId;
}
