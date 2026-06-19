import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginModal } from "@/components/LoginModal";

const fetchMock = vi.fn<typeof fetch>();

function renderModal(
  props: Partial<React.ComponentProps<typeof LoginModal>> = {},
) {
  const onClose = vi.fn();
  const onLogin = vi.fn();

  render(
    <LoginModal
      open
      onClose={onClose}
      onLogin={onLogin}
      {...props}
    />,
  );

  return { onClose, onLogin };
}

describe("LoginModal", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = "";
  });

  it("does not render when closed", () => {
    renderModal({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the local-only login form", () => {
    renderModal();

    expect(
      screen.getByRole("heading", { name: "登录你的穿搭档案" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("手机号或邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "微信快捷登录" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("界面演示，不会提交账号信息"),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("shows required errors for an empty submission", async () => {
    const user = userEvent.setup();
    const { onClose, onLogin } = renderModal();

    await user.click(screen.getByRole("button", { name: "登录并继续" }));

    expect(screen.getByText("请输入手机号或邮箱")).toBeInTheDocument();
    expect(screen.getByText("请输入密码")).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["muse@example.com", "muse"],
    ["13800123876", "用户3876"],
    ["衣橱主理人", "衣橱主理人"],
  ])("derives a local nickname from %s", async (account, displayName) => {
    const user = userEvent.setup();
    const { onClose, onLogin } = renderModal();

    await user.type(screen.getByLabelText("手机号或邮箱"), account);
    await user.type(screen.getByLabelText("密码"), "demo-password");
    await user.click(screen.getByRole("button", { name: "登录并继续" }));

    expect(onLogin).toHaveBeenCalledWith(displayName);
    expect(onClose).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByTestId("login-modal-backdrop"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when the dialog is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole("dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps WeChat login as an on-page demonstration", async () => {
    const user = userEvent.setup();
    const { onClose, onLogin } = renderModal();

    await user.click(screen.getByRole("button", { name: "微信快捷登录" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "微信登录仅作界面演示",
    );
    expect(onLogin).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("locks body scrolling only while open", () => {
    const { rerender, unmount } = render(
      <LoginModal open onClose={vi.fn()} onLogin={vi.fn()} />,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <LoginModal open={false} onClose={vi.fn()} onLogin={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe("");

    rerender(<LoginModal open onClose={vi.fn()} onLogin={vi.fn()} />);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
