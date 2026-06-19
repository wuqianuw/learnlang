import importlib
import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _placeholder(*args, **kwargs):
    return None


_agent_module_name = "app.agents.personal_clothing"
_chat_module_name = "app.api.v1.chat"
_agent_stub = types.ModuleType(_agent_module_name)
_agent_stub.search_recipes = _placeholder
_agent_stub.get_messages = _placeholder
_agent_stub.clear_messages = _placeholder

_api_package = importlib.import_module("app.api.v1")
_missing = object()
_previous_package_chat = getattr(_api_package, "chat", _missing)
_previous_chat_module = sys.modules.pop(_chat_module_name, None)
try:
    with patch.dict(sys.modules, {_agent_module_name: _agent_stub}):
        chat = importlib.import_module(_chat_module_name)
finally:
    sys.modules.pop(_chat_module_name, None)
    if _previous_chat_module is not None:
        sys.modules[_chat_module_name] = _previous_chat_module
    if _previous_package_chat is _missing:
        delattr(_api_package, "chat")
    else:
        _api_package.chat = _previous_package_chat

from app.api.v1 import oss


class ChatRouteTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(chat.router, prefix="/api/v1")
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_stream_returns_plain_text_chunks_and_forwards_request(self):
        async def search_results(message, image_url, thread_id):
            yield "第一段"
            yield "第二段"

        payload = {
            "message": "帮我推荐菜谱",
            "image_url": "https://example.com/fridge.jpg",
            "thread_id": "thread-123",
        }

        with patch.object(
            chat, "search_recipes", side_effect=search_results
        ) as search_recipes:
            response = self.client.post("/api/v1/chat/stream", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers["content-type"].startswith("text/plain"))
        self.assertEqual(response.text, "第一段第二段")
        search_recipes.assert_called_once_with(
            payload["message"], payload["image_url"], payload["thread_id"]
        )

    def test_messages_wraps_history_for_frontend(self):
        history = [
            {"role": "user", "content": "你好"},
            {"role": "assistant", "content": "你好！"},
        ]

        with patch.object(chat, "get_messages", return_value=history) as get_messages:
            response = self.client.get(
                "/api/v1/chat/messages", params={"thread_id": "thread-456"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"messages": history})
        get_messages.assert_called_once_with("thread-456")

    def test_delete_clears_requested_thread(self):
        with patch.object(chat, "clear_messages") as clear_messages:
            response = self.client.delete(
                "/api/v1/chat/messages", params={"thread_id": "thread-789"}
            )

        self.assertEqual(response.status_code, 200)
        clear_messages.assert_called_once_with("thread-789")


class OssRouteTests(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        app.include_router(oss.router, prefix="/api/v1")
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_jfif_is_signed_and_uploaded_as_jpeg(self):
        with patch.object(
            oss.client,
            "presign",
            return_value=SimpleNamespace(
                url='"https://upload.example.com/object"'
            ),
        ) as presign:
            response = self.client.get(
                "/api/v1/oss/presign", params={"filename": "photo.jfif"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["contentType"], "image/jpeg")
        request = presign.call_args.args[0]
        self.assertEqual(request.content_type, "image/jpeg")


if __name__ == "__main__":
    unittest.main()
