#!/bin/bash
# Run script for Memory System v2 - Next.js Frontend

echo "Starting Memory System v2 - Next.js Frontend"
echo "============================================="
echo ""
echo "Prerequisites:"
echo "  1. FastAPI backend must be running on http://localhost:8888"
echo "     Run: ./run_webui.sh (in a separate terminal)"
echo ""
echo "  2. Node.js and npm must be installed"
echo ""
echo "Starting Next.js development server..."
echo ""

cd nextjs-frontend && npm run dev
