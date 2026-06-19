"use client";

import { LogIn, Plus, Sparkles } from "lucide-react";

interface SiteHeaderProps {
  nickname: string | null;
  onLogin: () => void;
  onNewConversation: () => void;
  disabled?: boolean;
}

export function SiteHeader({
  nickname,
  onLogin,
  onNewConversation,
  disabled = false,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__identity">
          <span aria-hidden="true" className="site-header__mark">
            <Sparkles size={18} strokeWidth={1.8} />
          </span>
          <div>
            <p className="site-header__brand">ATELIER AI</p>
            <p className="site-header__role">私人穿搭顾问</p>
          </div>
        </div>

        <p className="site-header__subtitle">
          从衣橱灵感到场合造型，和你的 AI 顾问一起找到答案。
        </p>

        <div className="site-header__actions">
          {nickname ? (
            <div className="site-header__profile">
              <span
                aria-label={`${nickname} 的本地头像`}
                className="site-header__avatar"
                role="img"
              >
                {nickname.slice(0, 1).toUpperCase()}
              </span>
              <span className="site-header__nickname">{nickname}</span>
            </div>
          ) : (
            <button
              aria-label="登录"
              className="header-button header-button--quiet"
              onClick={onLogin}
              type="button"
            >
              <LogIn aria-hidden="true" size={17} />
              <span>登录</span>
            </button>
          )}

          <button
            aria-label="新建会话"
            className="header-button header-button--primary"
            disabled={disabled}
            onClick={onNewConversation}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            <span>新会话</span>
          </button>
        </div>
      </div>
    </header>
  );
}
