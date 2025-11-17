# Memory System v2 - Next.js Frontend

This is the Next.js frontend for Memory System v2, built with TypeScript and Tailwind CSS.

## Features

- **Real-time Chat**: SSE streaming chat interface with Claude
- **Memory Browser**: Live view of memory files with HDD-style activity indicators
- **Session Management**: View session history and generate sequence diagrams
- **Animations**: Custom Tailwind CSS animations for file operations
- **TypeScript**: Full type safety throughout the application
- **Responsive Design**: Tailwind CSS responsive utilities

## Prerequisites

1. **FastAPI Backend**: The backend must be running on `http://localhost:8888`
2. **Node.js**: Version 18+ required
3. **npm**: Comes with Node.js

## Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

**Important**: Make sure the FastAPI backend is running first:
```bash
# In the project root directory
./run_webui.sh
```

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
  page.tsx         # Main application page
  layout.tsx       # Root layout
  globals.css      # Global styles with custom animations

components/
  Chat.tsx         # Chat UI with SSE handling
  MemoryBrowser.tsx  # Memory file browser
  Sessions.tsx     # Session management
  SettingsModal.tsx  # Configuration modal

lib/
  api.ts           # API client functions
  utils.ts         # Utility functions

types/
  index.ts         # TypeScript type definitions
```

## Configuration

The application stores configuration in browser LocalStorage:
- `anthropic_api_key`: Your Anthropic API key
- `anthropic_model`: Selected Claude model
- `system_prompt_file`: Selected system prompt

## API Integration

All API calls go to the FastAPI backend running on port 8888:
- Session initialization
- Chat streaming (SSE)
- Memory file operations
- Session history and diagrams

## Custom Animations

The application includes custom Tailwind CSS animations for:
- File creation (slide-in)
- File access (green glow)
- File updates (orange glow)
- HDD activity lights (flicker effect)

## Tech Stack

- **Next.js 16**: React framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **clsx + tailwind-merge**: Dynamic class composition

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
