# Chat Stream Null Response Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat API's `null` response with the plain-text stream expected by the compiled frontend, restore history endpoints, and upload JFIF images as JPEG.

**Architecture:** Keep the existing FastAPI route, request schema, agent generator, and compiled frontend contract. The chat route will adapt `search_recipes()` into a `StreamingResponse`; history routes will expose existing checkpoint helpers; the OSS route will extend its MIME map without changing signing behavior.

**Tech Stack:** Python 3.13, FastAPI, Starlette `TestClient`, standard-library `unittest`, LangGraph agent generator, Alibaba Cloud OSS v2.

---

## File Structure

- Create `tests/__init__.py` so route regression tests can run as a standard-library unittest module.
- Create `tests/test_api_routes.py` for isolated API contract tests using FastAPI test applications and mocks at external boundaries.
- Modify `app/api/v1/chat.py` to implement stream, history-read, and history-clear routes.
- Modify `app/api/v1/oss.py` to map `.jfif` files to `image/jpeg`.

This workspace is not a Git repository, so the commit steps normally required by the workflow are replaced with explicit verification checkpoints.

### Task 1: Reproduce the chat and history route failures

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/test_api_routes.py`
- Test: `tests/test_api_routes.py`

- [ ] **Step 1: Create the test package**

Create an empty `tests/__init__.py`.

- [ ] **Step 2: Write failing route contract tests**

Create `tests/test_api_routes.py` with:

```python
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1 import chat


class ChatRouteTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(chat.router, prefix="/api/v1")
        self.client = TestClient(app)

    def test_stream_returns_plain_text_chunks_and_forwards_request(self):
        received = {}

        async def fake_search_recipes(prompt, image, thread_id):
            received.update(
                prompt=prompt,
                image=image,
                thread_id=thread_id,
            )
            yield "第一段"
            yield "第二段"

        with patch.object(chat, "search_recipes", fake_search_recipes):
            response = self.client.post(
                "/api/v1/chat/stream",
                json={
                    "message": "分析照片",
                    "image_url": "https://example.com/clothes.jfif",
                    "thread_id": "thread-1",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            response.headers["content-type"].startswith("text/plain")
        )
        self.assertEqual(response.text, "第一段第二段")
        self.assertEqual(
            received,
            {
                "prompt": "分析照片",
                "image": "https://example.com/clothes.jfif",
                "thread_id": "thread-1",
            },
        )

    def test_messages_wraps_history_for_frontend(self):
        history = [{"role": "assistant", "content": "历史回复"}]

        with patch.object(chat, "get_messages", return_value=history):
            response = self.client.get(
                "/api/v1/chat/messages",
                params={"thread_id": "thread-1"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"messages": history})

    def test_delete_clears_requested_thread(self):
        with patch.object(chat, "clear_messages") as clear:
            response = self.client.delete(
                "/api/v1/chat/messages",
                params={"thread_id": "thread-1"},
            )

        self.assertEqual(response.status_code, 200)
        clear.assert_called_once_with("thread-1")
```

- [ ] **Step 3: Run the tests and verify RED**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_api_routes.ChatRouteTests -v
```

Expected failures:

- stream content type is `application/json`, and body is `null`;
- history response is `null` instead of a `messages` object;
- mocked `clear_messages` is never called.

### Task 2: Implement the minimal chat API behavior

**Files:**
- Modify: `app/api/v1/chat.py:1-23`
- Test: `tests/test_api_routes.py`

- [ ] **Step 1: Implement the three route bodies**

Replace the route bodies in `app/api/v1/chat.py` with:

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.personal_clothing import (
    clear_messages,
    get_messages,
    search_recipes,
)
from app.models.schemas import ChatRequest

router = APIRouter()


@router.post("/chat/stream")
async def chat_endpoint(request: ChatRequest):
    """流式对话"""
    return StreamingResponse(
        search_recipes(
            request.message,
            request.image_url,
            request.thread_id,
        ),
        media_type="text/plain; charset=utf-8",
    )


@router.get("/chat/messages")
async def get_chat_messages(thread_id: str):
    """获取历史消息"""
    return {"messages": get_messages(thread_id)}


@router.delete("/chat/messages")
async def clear_chat_messages(thread_id: str):
    """清空历史消息"""
    clear_messages(thread_id)
    return {"success": True}
```

- [ ] **Step 2: Run the route tests and verify GREEN**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_api_routes.ChatRouteTests -v
```

Expected: three tests pass.

- [ ] **Step 3: Check the module compiles**

Run:

```powershell
.\.venv\Scripts\python.exe -m py_compile app\api\v1\chat.py
```

Expected: exit code 0 with no output.

### Task 3: Reproduce and fix the JFIF MIME mismatch

**Files:**
- Modify: `tests/test_api_routes.py`
- Modify: `app/api/v1/oss.py:33-39`
- Test: `tests/test_api_routes.py`

- [ ] **Step 1: Add the failing JFIF test**

Add these imports:

```python
from types import SimpleNamespace

from app.api.v1 import oss
```

Add this test class:

```python
class OssRouteTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(oss.router, prefix="/api/v1")
        self.client = TestClient(app)

    def test_jfif_is_signed_and_uploaded_as_jpeg(self):
        presigned = SimpleNamespace(
            url='"https://upload.example.com/object"'
        )

        with patch.object(
            oss.client,
            "presign",
            return_value=presigned,
        ) as presign:
            response = self.client.get(
                "/api/v1/oss/presign",
                params={"filename": "photo.jfif"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["contentType"], "image/jpeg")
        request = presign.call_args.args[0]
        self.assertEqual(request.content_type, "image/jpeg")
```

- [ ] **Step 2: Run the JFIF test and verify RED**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_api_routes.OssRouteTests.test_jfif_is_signed_and_uploaded_as_jpeg -v
```

Expected: failure because the current response content type is `application/octet-stream`.

- [ ] **Step 3: Add the minimal MIME mapping**

In `app/api/v1/oss.py`, add:

```python
"jfif": "image/jpeg",
```

immediately after the `jpeg` mapping.

- [ ] **Step 4: Run the JFIF test and verify GREEN**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_api_routes.OssRouteTests.test_jfif_is_signed_and_uploaded_as_jpeg -v
```

Expected: test passes.

### Task 4: Verify the complete fix

**Files:**
- Verify: `app/api/v1/chat.py`
- Verify: `app/api/v1/oss.py`
- Verify: `tests/test_api_routes.py`

- [ ] **Step 1: Run all regression tests**

Run:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: four tests pass with zero failures and zero errors.

- [ ] **Step 2: Compile every modified Python file**

Run:

```powershell
.\.venv\Scripts\python.exe -m py_compile app\api\v1\chat.py app\api\v1\oss.py tests\test_api_routes.py
```

Expected: exit code 0 with no output.

- [ ] **Step 3: Verify the running endpoint after reload**

Send a request through the running server:

```powershell
$body = @{
    message = "请给我穿搭建议"
    image_url = $null
    thread_id = "manual-verification"
} | ConvertTo-Json

Invoke-WebRequest `
    -Uri "http://127.0.0.1:8001/api/v1/chat/stream" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing
```

Expected:

- response `Content-Type` starts with `text/plain`;
- response body is generated text or the agent's existing fallback message;
- response body is not JSON `null`.

