#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing Seezo Security Review Tool...${NC}"

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}uv is not installed. Installing uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi

# Create uv environment with specific Python version
echo -e "${YELLOW}Creating uv environment with Python 3.11.6...${NC}"
uv venv --python 3.11.6

# Activate the environment
source .venv/bin/activate

# Install Python package
echo -e "${YELLOW}Installing Python package...${NC}"
uv pip install -e .

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Ollama is not installed. Would you like to install it? (y/n)${NC}"
    read -r install_ollama
    if [ "$install_ollama" = "y" ]; then
        echo -e "${YELLOW}Installing Ollama...${NC}"
        curl https://ollama.ai/install.sh | sh
    else
        echo -e "${YELLOW}Note: You'll need to install Ollama manually to use local AI processing${NC}"
    fi
fi

# Generate API key for local backend authentication
# This key is used to ensure that only authorized browser extensions can communicate with the local backend
# It prevents unauthorized access to the security analysis service running on your machine
api_key=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
echo -e "${YELLOW}Generated API key: ${api_key}${NC}"
echo -e "${YELLOW}This API key is used to authenticate your browser extension with the local backend.${NC}"
echo -e "${YELLOW}Please save this key and use it in the browser extension settings.${NC}"

# Create .env file
echo -e "${YELLOW}Creating .env file...${NC}"
cat > .env << EOL
SEEZO_API_KEY=${api_key}
EOL

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${YELLOW}To start the backend server:${NC}"
echo "1. Activate the environment: source .venv/bin/activate"
echo "2. Run the server: seezo"
echo -e "${YELLOW}Then load the browser extension from the 'extension' directory${NC}" 