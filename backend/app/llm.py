"""LLM streaming with three providers and a mock.

Order: MOCK_LLM=1 forces the mock. Otherwise Anthropic if ANTHROPIC_API_KEY is set,
then OpenAI if OPENAI_API_KEY is set, else the mock. The mock lets the demo path and
the smoke test run with no keys and no network.
"""
import asyncio
import os
from typing import AsyncIterator

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are the engine of a hackathon demo. Answer clearly and briefly.",
)


def provider() -> str:
    if os.getenv("MOCK_LLM") == "1":
        return "mock"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    return "mock"


async def _mock(prompt: str) -> AsyncIterator[str]:
    text = (
        f"Mock response to: {prompt!r}. "
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY in backend/.env to use a real model. "
        "This stream exists so the UI and the smoke test work offline."
    )
    for word in text.split(" "):
        await asyncio.sleep(0.02)
        yield word + " "


async def _anthropic(prompt: str) -> AsyncIterator[str]:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(timeout=30, max_retries=1)
    async with client.messages.stream(
        model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5"),
        max_tokens=int(os.getenv("MAX_TOKENS", "1024")),
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _openai(prompt: str) -> AsyncIterator[str]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(timeout=30, max_retries=1)
    stream = await client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        stream=True,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def stream_text(prompt: str) -> AsyncIterator[str]:
    p = provider()
    gen = {"anthropic": _anthropic, "openai": _openai}.get(p, _mock)
    async for piece in gen(prompt):
        yield piece
