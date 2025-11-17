# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Memory System v2** - A demonstration application for Claude's autonomous memory management using Anthropic's Memory Tool. Claude decides what to remember without explicit user commands, showcasing the evolution from explicit commands to implicit trust.

- **Related Article**: https://alteredcraft.com/p/the-memory-illusion-teaching-your
- **Memory Storage**: Plain text files in `./memory/memories/` for transparency
- **Session Recording**: All interactions traced to `./sessions/` as JSON
- **Architecture**: Single-user POC (not production-ready - no auth, global state)

## Development Commands

This is a **Next.js/TypeScript project**

```bash
# Setup
cd nextjs-frontend && npm install  # Install Next.js dependencies

# Run Next.js Full-Stack App (RECOMMENDED - Standalone)
./run_nextjs_standalone.sh       # Starts Next.js dev server on http://localhost:3000


# Generate Sequence Diagrams (now built into Next.js API)
# Accessible via Web UI or API: POST /api/sessions/{id}/diagram
```

## Configuration

### Environment Variables (Optional)

The Next.js app stores API keys in **browser localStorage** (single-user POC). Server-side environment variables are optional and only used for defaults.

Create `nextjs-frontend/.env` if you want server-side defaults:

```bash
# Optional - API key can be entered in web UI instead
# ANTHROPIC_API_KEY=sk-ant-...

# Optional - defaults to claude-sonnet-4-5-20250929
# ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Optional - logging levels
# APP_LOG_LEVEL=INFO
# DEPENDENCIES_LOG_LEVEL=WARNING
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

### Current Architecture

**Next.js Full-Stack Application** (Recommended):
- **Frontend**: Next.js 16 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes (server-side TypeScript)
- **Communication**: Server-Sent Events (SSE) for streaming responses
- **Port**: http://localhost:3000 (single dev server)
- **All-in-One**: No separate backend server needed


### Directory Structure

```
nextjs-frontend/     # Next.js Full-Stack App (TypeScript)
  app/
    api/             # Next.js API Routes (backend logic)
      chat/          # SSE streaming chat endpoint
      session/       # Session management
      memory/        # Memory file operations
      sessions/      # Session history & diagrams
      prompts/       # Prompt management
      health/        # Health check
      config/        # Configuration
    page.tsx         # Main application page
    layout.tsx       # Root layout
    globals.css      # Global styles with custom animations
  components/
    Chat.tsx         # Chat UI with SSE handling
    MemoryBrowser.tsx  # Memory file browser with animations
    Sessions.tsx     # Session history & diagram generation
    SettingsModal.tsx  # Configuration modal
  lib/
    api.ts           # API client functions (frontend)
    utils.ts         # Utility functions
    server/          # Server-side modules (backend logic)
      conversation-manager.ts  # ConversationManager
      memory-tool.ts           # LocalFilesystemMemoryTool
      session-trace.ts         # Session recording
      sequence-diagram.ts      # Diagram generation
      prompts.ts               # Prompt loading
      global-state.ts          # Global state management
  types/
    index.ts         # TypeScript type definitions

prompts/             # System prompt templates
memory/memories/     # Active memory storage (gitignored)
sessions/            # Session trace JSON files (gitignored)

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

### ConversationManager (`nextjs-frontend/lib/server/conversation-manager.ts`)

Central coordinator for message handling (server-side TypeScript):
- Manages conversation history with Claude
- Integrates MemoryTool and SessionTrace
- Handles streaming responses via async generators
- Tracks token usage (cumulative and per-request)
- Uses Anthropic TypeScript SDK with beta features

### LocalFilesystemMemoryTool (`nextjs-frontend/lib/server/memory-tool.ts`)

File-based memory storage implementation (server-side TypeScript):
- Storage location: `./memory/memories/`
- Security: Path traversal protection via `_validatePath()`
- All operations logged to session trace
- Supports: view, create, str_replace, insert, delete, rename
- Custom tool implementation (not using AbstractMemoryTool base class)

### Technology Stack

**Frontend:**
- Next.js 16 with TypeScript
- Tailwind CSS v4 for styling
- Custom animations (HDD lights, file operations)
- SSE streaming with fetch API
- LocalStorage keys: `anthropic_api_key`, `anthropic_model`, `system_prompt_file`

**Backend (Next.js API Routes):**
- TypeScript (ES modules)
- Node.js filesystem APIs (`fs`, `path`)
- Anthropic TypeScript SDK (`@anthropic-ai/sdk`)
- SSE streaming via ReadableStream
- Global state management (single-user POC)

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
