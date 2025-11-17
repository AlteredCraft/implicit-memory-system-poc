# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Memory System v2** - A demonstration application for Claude's autonomous memory management using Anthropic's Memory Tool. Claude decides what to remember without explicit user commands, showcasing the evolution from explicit commands to implicit trust.

- **Related Article**: https://alteredcraft.com/p/the-memory-illusion-teaching-your
- **Three Interfaces**: Next.js Web UI (recommended), Vanilla JS Web UI, and CLI
- **Memory Storage**: Plain text files in `./memory/memories/` for transparency
- **Session Recording**: All interactions traced to `./sessions/` as JSON
- **Architecture**: Single-user POC (not production-ready - no auth, global state)

## Development Commands

This is a **Python project using UV package manager** (not npm). However, the Next.js frontend requires Node.js/npm.

```bash
# Setup
uv sync                          # Install Python dependencies
cd nextjs-frontend && npm install  # Install Next.js dependencies

# Run Next.js Web UI (Recommended Interface)
./run_nextjs.sh                  # Starts Next.js dev server on http://localhost:3000
# Note: FastAPI backend must be running first (see below)

# Run FastAPI Backend (Required for Next.js)
./run_webui.sh                   # Starts FastAPI server on http://localhost:8888
# Or manually:
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8888 --reload

# Run Vanilla JS Web UI (Alternative Interface)
./run_webui.sh                   # Starts FastAPI server with vanilla JS frontend on http://localhost:8888

# Run CLI (Alternative Interface)
uv run src/chat.py              # Interactive terminal chat

# Generate Sequence Diagrams
uv run scripts/generate_sequence_diagram.py sessions/session_*.json
```

## Configuration

### Required Environment Variables (.env)

```bash
ANTHROPIC_API_KEY=sk-ant-...        # Required
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929  # Optional, defaults to this model
APP_LOG_LEVEL=INFO                   # DEBUG|INFO|WARNING|ERROR
DEPENDENCIES_LOG_LEVEL=WARNING       # Control library verbosity
```

### System Prompts

- Located in `/prompts/*.txt`
- Lines starting with `#` are comments (automatically stripped)
- Current date/time automatically appended during loading
- Selectable via CLI startup or Web UI settings modal

### Claude API Configuration

- Uses **beta feature**: `context-management-2025-06-27`
- Tool runner mode: `client.beta.messages.tool_runner()` for automatic tool execution
- Max tokens: 2048
- Token tracking: Cumulative input/output/cache_read/cache_write

## Architecture & Code Organization

### Multi-Interface Architecture

Three operating modes sharing core logic:

1. **Next.js Web UI** (Recommended)
   - Backend: FastAPI serving REST API
   - Frontend: Next.js 16 with TypeScript and Tailwind CSS
   - Communication: Server-Sent Events (SSE) for streaming responses
   - Port: http://localhost:3000 (dev server)

2. **Vanilla JS Web UI** (Alternative)
   - Backend: FastAPI serving REST API + static files
   - Frontend: Vanilla JavaScript SPA (no build process, ~1000 LOC)
   - Communication: Server-Sent Events (SSE) for streaming responses
   - Port: http://localhost:8888

3. **CLI** (Alternative)
   - Terminal-based interface with same core functionality
   - Direct Anthropic API integration

### Directory Structure

```
backend/              # FastAPI application
  main.py            # All API endpoints, SSE streaming setup
  core/
    conversation.py  # ConversationManager - coordinates messages & tools

nextjs-frontend/     # Next.js Web UI (TypeScript + Tailwind CSS)
  app/
    page.tsx         # Main application page
    layout.tsx       # Root layout
    globals.css      # Global styles with custom animations
  components/
    Chat.tsx         # Chat UI with SSE handling
    MemoryBrowser.tsx  # Memory file browser with animations
    Sessions.tsx     # Session history & diagram generation
    SettingsModal.tsx  # Configuration modal
  lib/
    api.ts           # API client functions
    utils.ts         # Utility functions
  types/
    index.ts         # TypeScript type definitions

frontend/            # Vanilla JS Web UI (Bootstrap 5)
  index.html         # Single-page application
  static/js/         # No framework, no build process
    app.js           # App initialization
    chat.js          # Chat UI & SSE handling
    memory.js        # Memory file browser
    sessions.js      # Session history & diagram generation

src/                 # Shared core modules (used by both CLI and backend)
  memory_tool.py     # LocalFilesystemMemoryTool implementation
  session_trace.py   # Session recording system
  chat.py            # CLI implementation

prompts/             # System prompt templates
memory/memories/     # Active memory storage (gitignored)
sessions/            # Session trace JSON files (gitignored)
diagrams/            # Generated Mermaid diagrams (gitignored)
```

### Key Architectural Patterns

**Memory Tool Pattern**
- Extends `BetaAbstractMemoryTool` from Anthropic SDK
- Implements: view, create, str_replace, insert, delete, rename operations
- **Path validation**: Enforces `/memories` prefix for security (`_validate_path()`)
- Integrated with session tracing for complete observability

**Session Tracing Pattern**
- Every interaction logged to `sessions/session_{timestamp}_{id}.json`
- Event types: user_input, llm_request, tool_call, tool_result, llm_response, token_usage, error
- Enables post-hoc analysis and Mermaid sequence diagram generation

**SSE Streaming Pattern**
- Backend: `AsyncGenerator` yielding JSON-serialized events
- Frontend: `EventSource` consuming SSE stream
- Event types: thinking, text, done, error

**Single-User POC Architecture**
- Global `conversation_manager` instance in backend
- No authentication/authorization
- API key stored in browser LocalStorage only (client-side)
- **Not production-ready** - See: https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool#security

### API Endpoints

All endpoints follow REST pattern: `/api/{resource}/{action}`

**Session**: `POST /api/session/initialize`, `GET /api/session/status`, `GET /api/session/current`
**Chat**: `POST /api/chat` (SSE streaming)
**Memory**: `GET /api/memory/files`, `GET /api/memory/files/{path}`, `DELETE /api/memory/clear`
**Sessions**: `GET /api/sessions`, `GET /api/sessions/{id}`, `POST /api/sessions/{id}/diagram`
**Prompts**: `GET /api/prompts`, `GET /api/prompts/{name}`
**Utilities**: `GET /api/health`, `GET /api/config`

## Important Technical Details

### ConversationManager (`backend/core/conversation.py`)

Central coordinator for message handling:
- Manages conversation history with Claude
- Integrates MemoryTool and SessionTrace
- Handles streaming responses
- Tracks token usage (cumulative and per-request)

### LocalFilesystemMemoryTool (`src/memory_tool.py`)

- File-based memory storage in `./memory/memories/`
- Security: Path traversal protection via `_validate_path()`
- All operations logged to session trace
- Supports: view, create, str_replace, insert, delete, rename

### Frontend Stacks

**Next.js Frontend (Recommended):**
- Next.js 16 with TypeScript
- Tailwind CSS for styling
- Custom animations (HDD lights, file operations)
- SSE streaming with fetch API
- LocalStorage keys: `anthropic_api_key`, `anthropic_model`, `system_prompt_file`

**Vanilla JS Frontend (Alternative):**
- Bootstrap 5.3.2 + Bootstrap Icons (CDN)
- Vanilla ES6+ JavaScript (no transpilation)
- LocalStorage keys: `anthropic_api_key`, `anthropic_model`, `system_prompt_file`

### Logging

Configurable via environment:
- `APP_LOG_LEVEL` - Application logs (default: INFO)
- `DEPENDENCIES_LOG_LEVEL` - Library logs (default: WARNING)
- Prefixes: `[MEMORY]`, `[TRACE]` for component identification

## CLI Commands

When running `uv run src/chat.py`:
- `/quit` - Exit
- `/memory_view` - View stored memories
- `/clear` - Clear all memories
- `/debug` - Toggle debug logging
- `/dump` - Display context window
