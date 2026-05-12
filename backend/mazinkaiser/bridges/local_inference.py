"""Local model inference adapter (stub).

Use ``UnifiedInferenceHub`` for all OpenAI-compatible traffic; swap ``OPENAI_BASE_URL`` for Ollama, vLLM, llama.cpp server, etc.
Keep safety governor BEFORE model invocation unchanged.
"""


from typing import Protocol, runtime_checkable


@runtime_checkable
class LocalModelInferencePort(Protocol):
    model_id: str

    async def complete(self, system: str, user: str, *, max_tokens: int = 512) -> str:
        ...
