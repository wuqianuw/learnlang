"use client";

import { type FormEvent, useEffect, useState } from "react";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (displayName: string) => void;
}

interface LoginErrors {
  account?: string;
  password?: string;
}

function getDisplayName(account: string) {
  const normalizedAccount = account.trim();

  if (normalizedAccount.includes("@")) {
    return normalizedAccount.split("@", 1)[0];
  }

  if (/^\d+$/.test(normalizedAccount)) {
    return `用户${normalizedAccount.slice(-4)}`;
  }

  return normalizedAccount;
}

export function LoginModal({ open, onClose, onLogin }: LoginModalProps) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    if (!account.trim()) {
      nextErrors.account = "请输入手机号或邮箱";
    }
    if (!password.trim()) {
      nextErrors.password = "请输入密码";
    }

    setErrors(nextErrors);
    setNotice("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onLogin(getDisplayName(account));
    onClose();
  }

  return (
    <div
      className="login-modal__backdrop"
      data-testid="login-modal-backdrop"
      onClick={onClose}
    >
      <section
        aria-labelledby="login-modal-title"
        aria-modal="true"
        className="login-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="关闭登录弹窗"
          className="login-modal__close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        <div className="login-modal__intro">
          <p className="login-modal__eyebrow">ATELIER MEMBER</p>
          <h2 id="login-modal-title">登录你的穿搭档案</h2>
          <p>保存偏好与灵感，让每次搭配建议更贴近你。</p>
        </div>

        <form className="login-modal__form" noValidate onSubmit={handleSubmit}>
          <label className="login-modal__field">
            <span>手机号或邮箱</span>
            <input
              aria-describedby={
                errors.account ? "login-account-error" : undefined
              }
              aria-invalid={Boolean(errors.account)}
              autoComplete="username"
              onChange={(event) => {
                setAccount(event.target.value);
                setErrors((current) => ({ ...current, account: undefined }));
              }}
              placeholder="输入手机号或邮箱"
              type="text"
              value={account}
            />
            {errors.account ? (
              <span
                className="login-modal__error"
                id="login-account-error"
                role="alert"
              >
                {errors.account}
              </span>
            ) : null}
          </label>

          <label className="login-modal__field">
            <span>密码</span>
            <input
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
              aria-invalid={Boolean(errors.password)}
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
              placeholder="输入密码"
              type="password"
              value={password}
            />
            {errors.password ? (
              <span
                className="login-modal__error"
                id="login-password-error"
                role="alert"
              >
                {errors.password}
              </span>
            ) : null}
          </label>

          <button className="login-modal__submit" type="submit">
            登录并继续
          </button>
        </form>

        <div className="login-modal__divider">
          <span>或</span>
        </div>

        <button
          className="login-modal__wechat"
          onClick={() => setNotice("微信登录仅作界面演示")}
          type="button"
        >
          <span aria-hidden="true">微</span>
          微信快捷登录
        </button>

        {notice ? (
          <p className="login-modal__notice" role="status">
            {notice}
          </p>
        ) : null}

        <p className="login-modal__disclaimer">
          界面演示，不会提交账号信息
        </p>
      </section>
    </div>
  );
}
