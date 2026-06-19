"use client";

import { Camera, MessageCircleMore, ScanSearch } from "lucide-react";

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void;
  onUpload: () => void;
}

const prompts = [
  {
    label: "通勤穿搭",
    prompt: "通勤穿搭：帮我搭一套利落、舒适又不过分正式的造型。",
  },
  {
    label: "约会造型",
    prompt: "约会造型：想要自然有氛围感，请给我一套搭配建议。",
  },
  {
    label: "旅行搭配",
    prompt: "旅行搭配：请兼顾上镜、舒适和一衣多穿。",
  },
] as const;

export function EmptyState({ onPromptSelect, onUpload }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div className="empty-state__intro">
        <p className="eyebrow">YOUR DAILY EDIT</p>
        <h1>今天想分析哪套穿搭？</h1>
        <p>
          上传一张照片，或告诉我场合、天气与风格偏好。我们从比例、配色和单品选择开始。
        </p>
      </div>

      <button
        aria-label="上传穿搭照片"
        className="empty-state__upload"
        onClick={onUpload}
        type="button"
      >
        <span className="empty-state__upload-icon">
          <Camera aria-hidden="true" size={24} />
        </span>
        <span>
          <strong>上传穿搭照片</strong>
          <small>支持 JPG、PNG 与 WebP</small>
        </span>
      </button>

      <div aria-label="穿搭问题示例" className="prompt-list">
        {prompts.map(({ label, prompt }) => (
          <button
            className="prompt-chip"
            key={label}
            onClick={() => onPromptSelect(prompt)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="capability-grid">
        <article className="capability-card">
          <ScanSearch aria-hidden="true" size={22} />
          <div>
            <h2>视觉穿搭分析</h2>
            <p>从廓形、比例、色彩和材质关系中，找到最值得调整的一步。</p>
          </div>
        </article>
        <article className="capability-card">
          <MessageCircleMore aria-hidden="true" size={22} />
          <div>
            <h2>场景化搭配建议</h2>
            <p>结合场合、天气与个人偏好，给出可以直接照做的搭配方案。</p>
          </div>
        </article>
      </div>
    </section>
  );
}
