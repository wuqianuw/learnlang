"use client";

import {
  ImagePlus,
  LoaderCircle,
  SendHorizontal,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useState,
} from "react";

interface ChatComposerProps {
  value: string;
  selectedFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onSelectedFileChange: (file: File | null) => void;
  onSend: () => void;
}

export function ChatComposer({
  value,
  selectedFile,
  fileInputRef,
  disabled = false,
  onValueChange,
  onSelectedFileChange,
  onSend,
}: ChatComposerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canSend = Boolean(value.trim() || selectedFile) && !disabled;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onSelectedFileChange(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  }

  return (
    <div className="composer-wrap">
      <div className="chat-composer">
        {previewUrl ? (
          <div className="chat-composer__preview">
            <img alt="待发送的穿搭预览" src={previewUrl} />
            <button
              aria-label="移除已选图片"
              disabled={disabled}
              onClick={() => onSelectedFileChange(null)}
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ) : null}

        <div className="chat-composer__controls">
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="选择穿搭图片"
            className="sr-only"
            disabled={disabled}
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <button
            aria-label="添加穿搭图片"
            className="composer-icon-button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <ImagePlus aria-hidden="true" size={21} />
          </button>

          <textarea
            aria-label="穿搭问题"
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述场合、风格，或问问这套穿搭怎么调整…"
            rows={1}
            value={value}
          />

          <button
            aria-label="发送消息"
            className="composer-send-button"
            disabled={!canSend}
            onClick={onSend}
            type="button"
          >
            {disabled ? (
              <LoaderCircle
                aria-hidden="true"
                className="composer-send-button__spinner"
                size={20}
              />
            ) : (
              <SendHorizontal aria-hidden="true" size={20} />
            )}
          </button>
        </div>

        <p className="chat-composer__hint">
          Enter 发送 · Shift + Enter 换行 · AI 建议仅供穿搭参考
        </p>
      </div>
    </div>
  );
}
