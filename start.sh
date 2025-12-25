#!/bin/bash

# AI Resume Generator - One-Click Start Script
# Usage: ./start.sh

set -e

echo "=========================================="
echo "    AI Resume Generator Startup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}Installing uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.local/bin/env 2>/dev/null || true
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Setup backend
echo -e "${GREEN}Setting up backend...${NC}"
cd "$SCRIPT_DIR/back"

# Create virtual environment and install dependencies
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    uv venv
fi

echo "Installing Python dependencies..."
uv pip install -e . 2>/dev/null || uv pip install -r <(cat <<EOF
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
tortoise-orm>=0.22.0
aiosqlite>=0.20.0
langchain>=0.3.0
langgraph>=0.2.0
langchain-openai>=0.2.0
pdfplumber>=0.11.0
python-docx>=1.1.0
pydantic>=2.9.0
pydantic-settings>=2.6.0
python-multipart>=0.0.12
weasyprint>=62.0
EOF
)

# Setup frontend
echo -e "${GREEN}Setting up frontend...${NC}"
cd "$SCRIPT_DIR/front"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Create .env file if not exists
cd "$SCRIPT_DIR/back"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating default .env file...${NC}"
    cat > .env <<EOF
# Admin Password (change this!)
ADMIN_SECRET_KEY=admin123

# Database
DATABASE_URL=sqlite://./data/resume.db

# LLM Configuration (optional, can be set in UI)
# LLM_BASE_URL=https://api.openai.com/v1
# LLM_API_KEY=your-api-key
# LLM_MODEL_NAME=gpt-4o
EOF
    echo -e "${YELLOW}Default password is: admin123${NC}"
    echo -e "${YELLOW}Please change it in back/.env${NC}"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${GREEN}Starting backend server...${NC}"
cd "$SCRIPT_DIR/back"
source .venv/bin/activate 2>/dev/null || . .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}Starting frontend server...${NC}"
cd "$SCRIPT_DIR/front"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo -e "${GREEN}AI Resume Generator is running!${NC}"
echo "=========================================="
echo ""
echo -e "Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "API Docs: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "Default password: ${YELLOW}admin123${NC}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
