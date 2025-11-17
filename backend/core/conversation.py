"""
Core conversation logic extracted from CLI chat.py for use in FastAPI backend.
Handles streaming responses from Claude with memory tool integration.
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import AsyncGenerator
import json

from anthropic import Anthropic
from anthropic.types.beta import BetaMemoryTool20250818ViewCommand

# Import from src directory
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))
from memory_tool import LocalFilesystemMemoryTool
from session_trace import SessionTrace


logger = logging.getLogger(__name__)


def load_system_prompt(prompt_file: str) -> str:
    """Load system prompt from file, stripping comment lines and appending current date."""
    try:
        with open(prompt_file, 'r', encoding='utf-8') as f:
            lines = []
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith('#'):
                    lines.append(line.rstrip())
                elif not stripped:
                    lines.append('')
            prompt = '\n'.join(lines).strip()

            # Append current date/time
            current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            prompt += f"\n\nToday's date is: {current_date}"

            return prompt
    except FileNotFoundError:
        logger.error(f"System prompt file not found: {prompt_file}")
        raise


def get_available_prompts(prompts_dir: str = "prompts") -> list[dict]:
    """Get list of available system prompts."""
    prompts_path = Path(prompts_dir)
    if not prompts_path.exists():
        return []

    prompt_files = sorted(prompts_path.glob("*.txt"))
    return [
        {
            "name": f.stem,
            "path": str(f),
            "filename": f.name
        }
        for f in prompt_files
    ]


class ConversationManager:
    """Manages a conversation session with Claude and memory tool."""

    def __init__(self, api_key: str, model: str, system_prompt: str):
        self.client = Anthropic(api_key=api_key)
        self.model = model
        self.system_prompt = system_prompt
        self.memory_tool = LocalFilesystemMemoryTool()
        self.messages = []

        # Initialize session trace
        self.trace = SessionTrace(model=model, system_prompt=system_prompt)
        self.memory_tool.set_trace(self.trace)

        # Token tracking
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cache_read_tokens = 0
        self.total_cache_write_tokens = 0

        logger.info(f"Initialized conversation with model: {model}")

    async def send_message_streaming(self, user_message: str) -> AsyncGenerator[dict, None]:
        """
        Send a message to Claude and return the response.

        Yields JSON events:
        - {"type": "thinking", "data": "Processing..."}
        - {"type": "memory_operation", "data": {...}}
        - {"type": "text", "data": "complete response text"}
        - {"type": "done", "data": {"tokens": {...}}}
        """
        # Add user message
        self.messages.append({"role": "user", "content": user_message})
        self.trace.log_user_input(user_message)

        # Log request
        self.trace.log_llm_request(messages_count=len(self.messages), tools=["memory"])
        logger.debug(f"Sending message to LLM: {user_message[:100]}...")

        try:
            # Send initial processing indicator
            yield {
                "type": "thinking",
                "data": "Processing..."
            }

            # Track message count before tool runner executes
            messages_before_count = len(self.messages)

            # Use tool_runner to get complete response (including all tool calls)
            runner = self.client.beta.messages.tool_runner(
                model=self.model,
                max_tokens=2048,
                system=self.system_prompt,
                tools=[self.memory_tool],
                messages=self.messages,
                betas=["context-management-2025-06-27"]
            )

            # Get final response (this runs all tool calls automatically)
            response = runner.until_done()

            # Get memory operations from the memory tool (it tracks them internally)
            memory_operations = self.memory_tool.get_and_clear_recent_operations()

            # DEBUG: Log detected memory operations
            if memory_operations:
                logger.info(f"[MEMORY_EVENTS] Detected {len(memory_operations)} memory operation(s)")
                for op in memory_operations:
                    logger.info(f"[MEMORY_EVENTS] → {op['operation']}: {op['path']}")
            else:
                logger.info(f"[MEMORY_EVENTS] No memory operations detected")

            # Emit memory operation events via SSE
            for operation in memory_operations:
                logger.info(f"[MEMORY_EVENTS] Emitting SSE event: {operation}")
                yield {
                    "type": "memory_operation",
                    "data": operation
                }

            # Extract response text
            response_text = ""
            for block in response.content:
                if hasattr(block, 'text'):
                    response_text = block.text
                    break

            # Yield complete response
            yield {
                "type": "text",
                "data": response_text
            }

            # Add to messages
            self.messages.append({"role": "assistant", "content": response_text})
            self.trace.log_llm_response(response_text)

            # Track token usage
            usage = response.usage
            last_input = usage.input_tokens
            last_output = usage.output_tokens
            last_cache_read = getattr(usage, 'cache_read_input_tokens', 0)
            last_cache_write = getattr(usage, 'cache_creation_input_tokens', 0)

            self.total_input_tokens += last_input
            self.total_output_tokens += last_output
            self.total_cache_read_tokens += last_cache_read
            self.total_cache_write_tokens += last_cache_write

            # Log token usage
            self.trace.log_token_usage(
                input_tokens=last_input,
                output_tokens=last_output,
                cache_read_tokens=last_cache_read,
                cache_write_tokens=last_cache_write,
                total_input_tokens=self.total_input_tokens,
                total_output_tokens=self.total_output_tokens,
                total_cache_read_tokens=self.total_cache_read_tokens,
                total_cache_write_tokens=self.total_cache_write_tokens
            )

            # Send final done event with token info
            yield {
                "type": "done",
                "data": {
                    "tokens": {
                        "last_input": last_input,
                        "last_output": last_output,
                        "last_cache_read": last_cache_read,
                        "last_cache_write": last_cache_write,
                        "total_input": self.total_input_tokens,
                        "total_output": self.total_output_tokens,
                        "total_cache_read": self.total_cache_read_tokens,
                        "total_cache_write": self.total_cache_write_tokens
                    }
                }
            }

        except Exception as e:
            logger.error(f"Error in conversation: {e}", exc_info=True)
            self.trace.log_error(error_type=type(e).__name__, message=str(e))
            yield {
                "type": "error",
                "data": {"message": str(e)}
            }

    def get_memory_contents(self) -> str:
        """View all memory contents."""
        view_command = BetaMemoryTool20250818ViewCommand(command="view", path="/memories")
        return self.memory_tool.view(view_command)

    def clear_memories(self) -> str:
        """Clear all memories and reset conversation."""
        result = self.memory_tool.clear_all_memory()
        self.messages = []

        # Reset token counters
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cache_read_tokens = 0
        self.total_cache_write_tokens = 0

        # Start new trace
        old_trace_file = self.trace.finalize()
        self.trace = SessionTrace(model=self.model, system_prompt=self.system_prompt)
        self.memory_tool.set_trace(self.trace)

        return result

    def finalize(self) -> str:
        """Finalize the session and return trace file path."""
        return self.trace.finalize()

    def get_token_stats(self) -> dict:
        """Get current token usage statistics."""
        return {
            "total_input": self.total_input_tokens,
            "total_output": self.total_output_tokens,
            "total_cache_read": self.total_cache_read_tokens,
            "total_cache_write": self.total_cache_write_tokens
        }
