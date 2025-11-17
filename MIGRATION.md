# Migration to Next.js Full-Stack Architecture

## Overview

The Memory System v2 application has been successfully migrated from a Python FastAPI backend + Next.js frontend architecture to a **single cohesive Next.js full-stack application**.

## What Changed

### Before (Python + Next.js)
- **Backend**: Python FastAPI (`backend/`, `src/`)
- **Frontend**: Next.js (proxying to FastAPI)
- **Dependencies**: Python/UV + Node.js/npm
- **Deployment**: Two separate processes (FastAPI server + Next.js dev server)
- **Language Split**: Python backend, TypeScript frontend

### After (Next.js Only)
- **Full-Stack**: Single Next.js application (`nextjs-frontend/`)
- **Backend**: Next.js API Routes (TypeScript)
- **Frontend**: Next.js UI (TypeScript)
- **Dependencies**: Node.js/npm only
- **Deployment**: Single process (Next.js dev server)
- **Language**: 100% TypeScript

## Files Ported from Python to TypeScript

### Core Modules (`nextjs-frontend/lib/server/`)

1. **memory-tool.ts** (from `src/memory_tool.py`)
   - File-based memory storage implementation
   - All CRUD operations: view, create, str_replace, insert, delete, rename
   - Path validation and security
   - Session tracing integration

2. **session-trace.ts** (from `src/session_trace.py`)
   - JSON-based session recording
   - Event logging for all interactions
   - Token usage tracking

3. **conversation-manager.ts** (from `backend/core/conversation.py`)
   - Central coordinator for Claude conversations
   - Memory tool integration
   - SSE streaming responses
   - Token usage aggregation

4. **sequence-diagram.ts** (from `scripts/generate_sequence_diagram.py`)
   - Mermaid diagram generation from session traces
   - Now accessible via API endpoint

5. **prompts.ts** (from `backend/core/conversation.py`)
   - System prompt loading and parsing
   - Comment stripping and date appending

6. **global-state.ts** (new)
   - Global conversation manager instance
   - Single-user POC state management

### API Endpoints (`nextjs-frontend/app/api/`)

All FastAPI endpoints ported to Next.js API Routes:

- `/api/health` - Health check
- `/api/config` - Configuration
- `/api/prompts` - List available prompts
- `/api/prompts/[name]` - Get specific prompt
- `/api/session/initialize` - Initialize session
- `/api/session/status` - Get session status
- `/api/session/current` - Get current session ID
- `/api/chat` - SSE streaming chat
- `/api/memory/files` - List memory files
- `/api/memory/files/[...path]` - Get specific memory file
- `/api/memory/clear` - Clear all memories
- `/api/sessions` - List all sessions
- `/api/sessions/[id]` - Get specific session
- `/api/sessions/[id]/diagram` - Generate sequence diagram

## Running the Application

### Old Way (Deprecated)
```bash
# Terminal 1: Start Python backend
./run_webui.sh  # FastAPI on :8888

# Terminal 2: Start Next.js frontend
./run_nextjs.sh  # Next.js on :3000
```

### New Way (Recommended)
```bash
# Single command - everything runs on :3000
./run_nextjs_standalone.sh
```

## Configuration

Create `nextjs-frontend/.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
APP_LOG_LEVEL=INFO
DEPENDENCIES_LOG_LEVEL=WARNING
```

## What's Deprecated

The following directories are **deprecated** and kept only for reference:
- `backend/` - Old FastAPI backend
- `frontend/` - Old Vanilla JS frontend
- `run_webui.sh` - Old script to start FastAPI
- `run_nextjs.sh` - Old script (required FastAPI backend)

The Python CLI (`src/chat.py`) still works if you have Python/UV installed.

## Benefits of the Migration

1. **Simplified Development**: One language (TypeScript), one framework (Next.js)
2. **Easier Deployment**: Single build output, one process to run
3. **Type Safety**: End-to-end TypeScript with shared types
4. **No CORS Issues**: API and UI in same app
5. **Better Performance**: No proxy overhead
6. **Reduced Dependencies**: No Python/UV required (unless using CLI)

## Technical Notes

### Anthropic SDK Differences

- Python: `anthropic` package with `client.beta.messages.tool_runner()`
- TypeScript: `@anthropic-ai/sdk` with `client.messages.create()`
- Beta features (like `context-management-2025-06-27`) not yet in TypeScript SDK
- Manual tool loop handling in TypeScript version

### File System Operations

- Python: `pathlib.Path` and `shutil`
- TypeScript: Node.js `fs` and `path` modules
- Both work identically for our use case

### SSE Streaming

- Python: `AsyncGenerator` yielding events
- TypeScript: `ReadableStream` with encoder
- Both achieve same SSE functionality

## Migration Checklist

- [x] Install @anthropic-ai/sdk
- [x] Port MemoryTool to TypeScript
- [x] Port SessionTrace to TypeScript
- [x] Port ConversationManager to TypeScript
- [x] Port sequence diagram generation
- [x] Port prompt utilities
- [x] Create all API routes
- [x] Update configuration
- [x] Update documentation
- [x] Test build successfully
- [ ] Test runtime functionality
- [ ] Test memory operations
- [ ] Test session recording
- [ ] Test diagram generation

## Testing the Migration

```bash
cd nextjs-frontend

# Build check (should pass)
npm run build

# Start dev server
npm run dev

# Open http://localhost:3000
# Test:
# 1. Initialize session with API key
# 2. Send a message
# 3. Check memory files are created
# 4. Check session is recorded
# 5. Generate a diagram
```

## Rollback Plan

If issues arise, the old architecture still exists:
```bash
# Use old FastAPI + vanilla JS frontend
./run_webui.sh  # Port 8888

# Or use Python CLI
uv run src/chat.py
```

## Future Improvements

1. Add proper state management (e.g., Zustand) instead of global singleton
2. Add authentication and multi-user support
3. Deploy to Vercel/other serverless platform
4. Add database for sessions instead of JSON files
5. Add WebSocket support for real-time updates
