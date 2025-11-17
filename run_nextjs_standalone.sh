#!/bin/bash


echo "🚀 Starting Memory System v2 - Next.js"
echo "=================================================="
echo ""
echo "The Next.js application includes both frontend and backend."
echo ""

# Check if .env exists in nextjs-frontend
if [ ! -f nextjs-frontend/.env ]; then
    echo "⚠️  Warning: nextjs-frontend/.env not found"
    echo "   Please copy nextjs-frontend/.env.example to nextjs-frontend/.env"
    echo "   and add your ANTHROPIC_API_KEY"
    echo ""
fi

# Change to nextjs-frontend directory
cd nextjs-frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🌐 Starting Next.js development server on http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
