from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, AIMessageChunk, AIMessage
from langchain_core.tools import tool
from langchain_tavily import TavilySearch
from langchain.agents import create_agent
from app.common.logger import logger
import os
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3
# 1.加载环境变量
from dotenv import load_dotenv
load_dotenv()

# 2.web搜索工具，使用tavily作为web搜索工具
web_search = TavilySearch(
    max_results=5,
    topic="general"
)

# 3.多模态模型
model = init_chat_model(
    model="qwen3.5-plus",  # 模型名称，这里选择qwen3.5-plus，这是一个多模态模型，支持图片、文本、音频、视频
    model_provider="openai",
    base_url=os.getenv("DASHSCOPE_BASE_URL"),
    api_key=os.getenv("DASHSCOPE_API_KEY")
)

from pathlib import Path

db_path = Path(__file__).resolve().parent.parent / "db" / "personal_clothing.db"

connection = sqlite3.connect(
    db_path,
    check_same_thread=False
)
# 初始化checkpointer
checkpointer = SqliteSaver(connection)
# 自动建表
checkpointer.setup()

# 4.Agent系统提示词
system_prompt = """
你是一名专业的私人穿搭顾问。收到用户提供的服装照片、衣物清单、个人信息或穿搭需求后，请按照以下流程操作：

1. 识别并整理现有单品：
若用户提供照片，首先辨识照片中可见的服装、鞋履、包袋和配饰，并分析其颜色、版型、材质、风格、季节属性及适用场景。
结合单品状态与搭配价值，整理出一份“当前可用穿搭单品清单”。
无法从照片中准确判断的信息需要明确说明，不要凭空猜测。

2. 补充穿搭需求：
根据用户提供的性别偏好、年龄、身高、体型、肤色、所在地区天气、出席场合、预算和风格偏好制定建议。
如果缺少会明显影响穿搭方案的关键信息，应简洁询问用户，不能直接假定。

3. 查询天气和穿搭参考：
调用 web_search 工具，以“天气、场合、风格偏好、现有单品”为核心关键词，搜索当前适用的穿搭方案、配色参考和单品搭配方法。
搜索不到合适资料时，才能基于专业穿搭知识自行设计方案。

4. 生成候选穿搭：
优先使用用户已有单品，生成至少三套完整穿搭。
每套方案应包含上装、下装、鞋履、外套、包袋和配饰；不需要的部分可以明确标注为可选。
如果现有单品不足，可以提出少量补购建议，并说明预算优先级和复用价值。

5. 多维度评估与排序：
从以下维度为每套方案进行量化评分：
- 场合适配度：满分 10 分
- 天气适配度：满分 10 分
- 色彩协调度：满分 10 分
- 身形修饰效果：满分 10 分
- 舒适与实用性：满分 10 分
- 现有单品利用率：满分 10 分

计算综合得分并进行排序。优先推荐符合天气和场合、容易执行、舒适自然且能充分利用现有衣物的方案。

6. 结构化输出：
将排序后的穿搭方案整理成结构清晰的建议报告，每套方案需要包含：
- 方案名称与风格定位
- 完整单品组合
- 推荐配色
- 适用天气和场合
- 各维度评分与综合得分
- 推荐理由
- 穿搭注意事项
- 可选替换单品
- 参考图片或图片来源链接
- 必要时提供补购清单和预算建议

7. 安全与真实性要求：
不要根据照片擅自推断用户的民族、健康状况等敏感信息。
不要对用户的外貌或体型作贬低性评价，应使用尊重、中立和具有建设性的表达。
无法确认品牌、材质、尺寸或颜色时，应明确标注为推测。
不得编造搜索结果、商品信息、价格或图片来源。

请严格按照上述流程执行。优先查询天气并调用 web_search 搜索穿搭参考；只有在工具不可用或没有合适结果时，才能基于自身知识补充建议。
"""

# 5.创建Agent
agent = create_agent(
    model=model,  # 模型
    tools=[web_search],  # 工具
    checkpointer=checkpointer,  # 记忆
    system_prompt=system_prompt  # 系统提示词
)

# 流式对话
async def search_recipes(prompt: str, image: str, thread_id: str):
    """调用agent搜索食谱"""
    logger.info(f"[用户]: {prompt}, image: {image}, thread_id: {thread_id}")
    try:
        # 判断是否有图片，封装不同格式的消息
        if not image or image.strip() == "":
            message = HumanMessage(content=prompt)
        else:
            message = HumanMessage(content=[
                {"type": "image", "url": image},
                {"type": "text", "text": prompt}
            ])

        # 流式调用Agent
        for chunk, metadata in agent.stream(
            {"messages": [message]},
            {"configurable": {"thread_id": thread_id}},
            stream_mode="messages"
        ):
            if isinstance(chunk, AIMessageChunk) and chunk.content:
                yield chunk.content

    except Exception as e:
        logger.error(f"\n[错误]: {str(e)}")
        yield "信息检索失败，试试看手动输入衣物列表？"

# 清空会话
def clear_messages(thread_id: str):
    """清空会话"""
    logger.info(f"清空历史消息，thread_id: {thread_id}")
    checkpointer.delete_thread(thread_id)

# 查询会话历史
def get_messages(thread_id: str) -> list[dict[str, str]]:
    """获取会话历史"""
    logger.info(f"获取历史消息，thread_id: {thread_id}")

    # 根据 thread_id 查询 checkpoint
    checkpoint = checkpointer.get({"configurable": {"thread_id": thread_id}})

    # 如果不存在，返回空列表
    if not checkpoint:
        return []

    # 安全获取 messages
    channel_values = checkpoint.get("channel_values")
    if not channel_values:
        return []

    messages = channel_values.get("messages", [])
    if not messages:
        return []

    # 转换消息格式
    result = []
    for msg in messages:
        if not msg.content:
            continue

        if isinstance(msg, HumanMessage):
            result.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            result.append({"role": "assistant", "content": msg.content})

    return result