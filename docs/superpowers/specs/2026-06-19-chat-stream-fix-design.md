# Chat Stream Null Response Fix

## Goal

Fix the web client's `null` response when submitting text or an uploaded image, while preserving the protocol already implemented in the compiled Next.js frontend.

## Confirmed Root Cause

`POST /api/v1/chat/stream` currently executes `pass`. FastAPI converts the resulting Python `None` value to an HTTP 200 JSON response containing `null`. The route never invokes the clothing agent.

The compiled frontend sends this JSON payload:

```json
{
  "message": "...",
  "image_url": "https://...",
  "thread_id": "..."
}
```

It reads the response with `response.body.getReader()` and a `TextDecoder`, appending every decoded chunk directly to the assistant message. It does not parse JSON or Server-Sent Events.

## API Design

### Stream chat

`POST /api/v1/chat/stream` will:

1. Accept the existing `ChatRequest`.
2. Call `search_recipes(request.message, request.image_url, request.thread_id)`.
3. Return that async generator through `StreamingResponse`.
4. Use `text/plain; charset=utf-8`.

No SSE framing such as `data:` will be added because the current client would display it as answer text.

### Read chat history

`GET /api/v1/chat/messages?thread_id=...` will call `get_messages(thread_id)` and return:

```json
{
  "messages": []
}
```

This matches the compiled frontend's use of `(await response.json()).messages`.

### Clear chat history

`DELETE /api/v1/chat/messages?thread_id=...` will call `clear_messages(thread_id)` and return a small JSON success response. The frontend only checks the HTTP status.

### JFIF uploads

The OSS content type map will treat `jfif` as `image/jpeg`. This keeps the MIME type used to sign the PUT request consistent with the browser upload header.

## Error Handling

Request schema validation remains handled by FastAPI. Agent execution errors remain handled inside `search_recipes`, which logs the exception and yields its existing user-facing fallback message.

OSS signing errors are not changed by this fix.

## Testing

Tests will replace the route's agent generator with a deterministic async generator, then verify:

1. The chat route no longer returns JSON `null`.
2. The response content type is plain text.
3. Multiple generated chunks are returned in order.
4. Request fields are passed to the generator without renaming or loss.
5. History responses use the `messages` wrapper expected by the frontend.
6. Clearing history invokes the existing clear function.
7. A `.jfif` filename maps to `image/jpeg`.

Tests will not invoke the real model or perform an OSS upload.

## Scope

Production changes are limited to:

- `app/api/v1/chat.py`
- `app/api/v1/oss.py`

Test files may be added under `tests/`. The compiled frontend will not be modified.
