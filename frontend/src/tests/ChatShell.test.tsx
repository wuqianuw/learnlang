import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatShell } from "@/components/ChatShell";

const apiMocks = vi.hoisted(() => ({
  clearChatMessages: vi.fn(),
  getChatMessages: vi.fn(),
  streamChat: vi.fn(),
  uploadImage: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  getOrCreateThreadId: vi.fn(),
  replaceThreadId: vi.fn(),
}));

vi.mock("@/lib/api", () => apiMocks);
vi.mock("@/lib/session", () => sessionMocks);

const objectUrl = "blob:atelier-preview";
const createObjectURL = vi.fn(() => objectUrl);
const revokeObjectURL = vi.fn();

function renderChat() {
  return render(<ChatShell />);
}

async function waitForHistory() {
  await waitFor(() => {
    expect(apiMocks.getChatMessages).toHaveBeenCalledWith("thread-current");
  });
}

async function selectImage(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(["look"], "look.jpg", { type: "image/jpeg" });
  await user.upload(screen.getByLabelText("选择穿搭图片"), file);
  return file;
}

describe("ChatShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMocks.getOrCreateThreadId.mockReturnValue("thread-current");
    sessionMocks.replaceThreadId.mockReturnValue("thread-next");
    apiMocks.getChatMessages.mockResolvedValue([]);
    apiMocks.clearChatMessages.mockResolvedValue(undefined);
    apiMocks.uploadImage.mockResolvedValue("https://cdn.example/look.jpg");
    apiMocks.streamChat.mockResolvedValue(undefined);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

  it("shows the fashion empty state and primary navigation", async () => {
    renderChat();
    await waitForHistory();

    expect(
      screen.getByRole("heading", { name: "今天想分析哪套穿搭？" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ATELIER AI")).toBeInTheDocument();
    expect(screen.getByText("私人穿搭顾问")).toBeInTheDocument();
    expect(
      screen.getByText("从衣橱灵感到场合造型，和你的 AI 顾问一起找到答案。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "新建会话" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "上传穿搭照片" }),
    ).toBeInTheDocument();
    expect(screen.getByText("视觉穿搭分析")).toBeInTheDocument();
    expect(screen.getByText("场景化搭配建议")).toBeInTheDocument();
  });

  it("opens login and shows the locally derived nickname", async () => {
    const user = userEvent.setup();
    renderChat();
    await waitForHistory();

    await user.click(screen.getByRole("button", { name: "登录" }));
    expect(
      screen.getByRole("heading", { name: "登录你的穿搭档案" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("手机号或邮箱"), "muse@example.com");
    await user.type(screen.getByLabelText("密码"), "demo-password");
    await user.click(screen.getByRole("button", { name: "登录并继续" }));

    expect(screen.getByText("muse")).toBeInTheDocument();
    expect(screen.getByLabelText("muse 的本地头像")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["通勤穿搭", "约会造型", "旅行搭配"])(
    "fills the composer from the %s prompt",
    async (prompt) => {
      const user = userEvent.setup();
      renderChat();
      await waitForHistory();

      await user.click(screen.getByRole("button", { name: prompt }));

      expect(
        (
          screen.getByRole("textbox", {
            name: "穿搭问题",
          }) as HTMLTextAreaElement
        ).value,
      ).toContain(prompt);
    },
  );

  it("previews a selected image, removes it, and revokes its object URL", async () => {
    const user = userEvent.setup();
    const { unmount } = renderChat();
    await waitForHistory();

    await selectImage(user);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByAltText("待发送的穿搭预览")).toHaveAttribute(
      "src",
      objectUrl,
    );

    await user.click(screen.getByRole("button", { name: "移除已选图片" }));

    expect(screen.queryByAltText("待发送的穿搭预览")).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);

    await selectImage(user);
    unmount();
    expect(revokeObjectURL).toHaveBeenLastCalledWith(objectUrl);
  });

  it("sends on Enter but keeps Shift+Enter as a newline", async () => {
    const user = userEvent.setup();
    renderChat();
    await waitForHistory();
    const textarea = screen.getByRole("textbox", { name: "穿搭问题" });

    await user.type(textarea, "第一行");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(apiMocks.streamChat).not.toHaveBeenCalled();

    fireEvent.change(textarea, { target: { value: "第一行\n第二行" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(apiMocks.streamChat).toHaveBeenCalledWith({
        message: "第一行\n第二行",
        imageUrl: undefined,
        threadId: "thread-current",
        onChunk: expect.any(Function),
      });
    });
  });

  it("streams text directly when no image is selected", async () => {
    const user = userEvent.setup();
    renderChat();
    await waitForHistory();

    await user.type(screen.getByRole("textbox", { name: "穿搭问题" }), "分析配色");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    await waitFor(() => expect(apiMocks.streamChat).toHaveBeenCalledOnce());
    expect(apiMocks.uploadImage).not.toHaveBeenCalled();
    expect(apiMocks.streamChat).toHaveBeenCalledWith({
      message: "分析配色",
      imageUrl: undefined,
      threadId: "thread-current",
      onChunk: expect.any(Function),
    });
  });

  it("uploads an image before streaming and uses a fashion prompt for image-only sends", async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    apiMocks.uploadImage.mockImplementation(async () => {
      order.push("upload");
      return "https://cdn.example/look.jpg";
    });
    apiMocks.streamChat.mockImplementation(async () => {
      order.push("stream");
    });
    renderChat();
    await waitForHistory();

    const file = await selectImage(user);
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    await waitFor(() => expect(apiMocks.streamChat).toHaveBeenCalledOnce());
    expect(apiMocks.uploadImage).toHaveBeenCalledWith(file);
    expect(order).toEqual(["upload", "stream"]);
    expect(apiMocks.streamChat).toHaveBeenCalledWith({
      message: "请分析这套穿搭，并给出具体的搭配建议。",
      imageUrl: "https://cdn.example/look.jpg",
      threadId: "thread-current",
      onChunk: expect.any(Function),
    });
  });

  it("appends assistant chunks in arrival order", async () => {
    const user = userEvent.setup();
    apiMocks.streamChat.mockImplementation(async ({ onChunk }) => {
      onChunk("先看");
      onChunk("整体比例");
      onChunk("，再调整配色。");
    });
    renderChat();
    await waitForHistory();

    await user.type(screen.getByRole("textbox", { name: "穿搭问题" }), "帮我看看");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    expect(
      await screen.findByText("先看整体比例，再调整配色。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("正在思考搭配建议…")).not.toBeInTheDocument();
  });

  it("shows a readable assistant error when sending fails", async () => {
    const user = userEvent.setup();
    apiMocks.streamChat.mockRejectedValue(new Error("network down"));
    renderChat();
    await waitForHistory();

    await user.type(screen.getByRole("textbox", { name: "穿搭问题" }), "帮我看看");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "暂时无法获得穿搭建议，请稍后再试。",
    );
    expect(alert).not.toHaveTextContent("network down");
  });

  it("clears the current conversation and replaces the thread id", async () => {
    const user = userEvent.setup();
    renderChat();
    await waitForHistory();

    await user.click(screen.getByRole("button", { name: "新建会话" }));

    await waitFor(() => {
      expect(apiMocks.clearChatMessages).toHaveBeenCalledWith("thread-current");
    });
    expect(sessionMocks.replaceThreadId).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(apiMocks.getChatMessages).toHaveBeenCalledWith("thread-next");
    });

    await user.type(screen.getByRole("textbox", { name: "穿搭问题" }), "新问题");
    await user.click(screen.getByRole("button", { name: "发送消息" }));

    await waitFor(() => {
      expect(apiMocks.streamChat).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: "thread-next" }),
      );
    });
  });

  it("loads and converts existing history into visible messages", async () => {
    apiMocks.getChatMessages.mockResolvedValue([
      {
        role: "user",
        content: [
          { type: "text", text: "这是昨天的搭配" },
          { type: "image", url: "https://cdn.example/history.jpg" },
        ],
      },
      {
        role: "assistant",
        content: "可以把外套换成短款，比例会更利落。",
      },
    ]);

    renderChat();

    expect(await screen.findByText("这是昨天的搭配")).toBeInTheDocument();
    expect(
      screen.getByAltText("用户上传的穿搭"),
    ).toHaveAttribute("src", "https://cdn.example/history.jpg");
    const assistant = screen.getByText("可以把外套换成短款，比例会更利落。");
    expect(
      within(assistant.closest("article") as HTMLElement).getByText(
        "ATELIER AI",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "今天想分析哪套穿搭？" }),
    ).not.toBeInTheDocument();
  });
});
