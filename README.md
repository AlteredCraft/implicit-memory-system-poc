# Memory System v2

**A Next.js demonstration of Claude's autonomous memory management** using Anthropic's Memory Tool. Claude decides what to remember from your conversations and manages its own persistent memory across sessions - no explicit commands needed.

**Related Article:** [The Memory Illusion: Teaching Your LLM to Remember](https://alteredcraft.com/p/the-memory-illusion-teaching-your)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Setup

```bash
# 1. Install dependencies
cd nextjs-frontend
npm install

# 2. Configure your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Run the app
npm run dev
# Open http://localhost:3000
```

Or use the convenience script:
```bash
./run_nextjs_standalone.sh
```

---

## ✨ Features

### 🌐 Modern Web Interface
- **Real-time streaming chat** - See Claude's responses as they're generated
- **Memory file browser** - Visual explorer for Claude's memory files
- **Session history** - Review past conversations with token usage stats
- **Sequence diagrams** - Generate Mermaid diagrams from session traces
- **System prompt selection** - Choose from different assistant personalities

### 🧠 Autonomous Memory Management
Claude decides what to remember during natural conversations:

**Example:**
```
You: Hi, I'm Alex. My son Leo turns 5 next Tuesday.
Claude: Hi Alex! Nice to meet you. Happy early 5th birthday to Leo!
         [Creates /memories/user_profile.txt]

# Later...
You: What gift ideas do you have?
Claude: For Leo's 5th birthday, here are some age-appropriate ideas...
        [Recalls Leo's age from memory]
```

**How it works:**
1. **You chat naturally** - No special commands needed
2. **Claude decides what to remember** - Names, preferences, project details
3. **Memory persists** - Stored as text files in `./memory/memories/`
4. **Automatic recall** - Claude retrieves relevant memories when needed

### 📊 Session Recording & Analysis
- Every conversation traced to `./sessions/` as JSON
- Full observability: messages, tool calls, token usage
- Generate visual sequence diagrams showing interaction flow
- Export and analyze conversation patterns

---

## 🏗️ Architecture

**Single Next.js Full-Stack Application:**
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes (server-side TypeScript)
- **Communication:** Server-Sent Events (SSE) for streaming
- **Storage:** Local filesystem for memory files and sessions
- **AI:** Anthropic Claude with Memory Tool integration

**Key Components:**
- `ConversationManager` - Orchestrates Claude conversations
- `LocalFilesystemMemoryTool` - File-based memory storage
- `SessionTrace` - Records all interactions for analysis
- 14 API Routes - Session, chat, memory, and history management

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

---

## 📁 Project Structure

```
nextjs-frontend/          # Main application
├── app/
│   ├── api/             # Next.js API Routes (backend)
│   │   ├── chat/        # SSE streaming endpoint
│   │   ├── session/     # Session management
│   │   ├── memory/      # Memory operations
│   │   └── sessions/    # History & diagrams
│   ├── page.tsx         # Main UI
│   └── components/      # React components
├── lib/
│   ├── api.ts           # Frontend API client
│   └── server/          # Backend modules
│       ├── conversation-manager.ts
│       ├── memory-tool.ts
│       ├── session-trace.ts
│       └── sequence-diagram.ts
└── .env                 # Configuration (API key)

prompts/                 # System prompt templates
memory/memories/         # Active memory storage (gitignored)
sessions/                # Session traces (gitignored)
```

---

## 🎨 System Prompts

Choose from different assistant personalities in the UI settings:

```
prompts/
├── concise prompt_explanatory.txt       # Verbose memory logging
├── concise prompt.txt                   # Standard behavior
├── more precise prompt_explanatory.txt  # Detailed explanations
└── more precise prompt.txt              # Fine-tuned responses
```

**Custom Prompts:**
- Create `.txt` files in `prompts/` directory
- They'll automatically appear in the UI selector
- Lines starting with `#` are comments (stripped automatically)
- Current date/time appended automatically

---

## 🔧 Configuration

### Environment Variables

Create `nextjs-frontend/.env`:

```bash
# Your Anthropic API key (required)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Model selection (defaults to claude-sonnet-4-5-20250929)
# ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

**Note:** The app stores API keys in browser localStorage (single-user POC). Server-side env vars are optional and only used for defaults.

### Storage Locations

- **Memory files:** `./memory/memories/` (plain text, gitignored)
- **Session traces:** `./sessions/` (JSON, gitignored)
- **Prompts:** `./prompts/` (versioned in git)

---

## 📊 Session Traces & Diagrams

Every conversation is recorded with complete observability:

```json
{
  "session_id": "20250117_143022_abc123",
  "start_time": "2025-01-17T14:30:22Z",
  "model": "claude-sonnet-4-5-20250929",
  "events": [
    {"event_type": "user_input", "content": "..."},
    {"event_type": "tool_call", "tool_name": "memory", "command": "create"},
    {"event_type": "llm_response", "content": "..."},
    {"event_type": "token_usage", "cumulative": {...}}
  ]
}
```

**Generate Sequence Diagrams:**
1. View any session in the UI
2. Click "Generate Diagram"
3. See Mermaid visualization of interaction flow

Diagrams show:
- User inputs and Claude responses
- Memory tool operations (create, view, update, delete)
- Tool execution results and errors
- Chronological conversation turns

---


## 🚢 Deployment

### Local Development
```bash
cd nextjs-frontend
npm run dev  # http://localhost:3000
```

### Production Build
```bash
cd nextjs-frontend
npm run build
npm run start  # Production server
```

### Deploy to Vercel
```bash
cd nextjs-frontend
vercel deploy
```

**Important:** This is a single-user POC with:
- No authentication
- Global state management
- Client-side API key storage (localStorage)

For production use, add proper auth and secure key management. See [Anthropic's security guidelines](https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool#security).

---

## 🔍 Troubleshooting

**Claude isn't remembering things?**
- Try an `_explanatory` system prompt to see tool operations
- Check `memory/memories/` for created files
- Review session traces in the Sessions tab

**Memory files not persisting?**
- Ensure `memory/memories/` directory exists
- Check file permissions

**Chat not streaming?**
- Check browser console for errors
- Verify API key is set correctly
- Check Next.js dev server logs

**Session not initializing?**
- Verify API key format (should start with `sk-ant-`)
- Check network tab for API errors
- Ensure prompts directory exists

---

## 📚 Learn More

- **Article:** [The Memory Illusion v2: From Explicit Commands to Implicit Trust](https://alteredcraft.com/p/the-memory-illusion-teaching-your)
- **Anthropic Docs:** [Memory Tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool)
- **Architecture Details:** [CLAUDE.md](CLAUDE.md) - Comprehensive technical documentation
- **Original v1:** [simple_llm_memory_poc](https://github.com/AlteredCraft/simple_llm_memory_poc)

---

## 🤝 Contributing

This is a demonstration project, but improvements are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Acknowledgments

- Built with [Anthropic's Claude](https://www.anthropic.com/claude) and [Memory Tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool)
- Powered by [Next.js](https://nextjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

**Made with ❤️ by [AlteredCraft](https://alteredcraft.com)**
