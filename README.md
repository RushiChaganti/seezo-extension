# Seezo - Browser Security Design Review Plugin

A privacy-first browser extension that leverages local AI models to analyze web interfaces for security vulnerabilities and sensitive asset exposure.


## This Repo is being Archived. 

## Features

- 🔒 Local-only processing - No data leaves your machine
- 🤖 Multiple AI backend support (Ollama, Claude, Gemini, OpenAI)
- 🔍 Real-time security vulnerability scanning
- 🛡️ Sensitive asset detection (PII, tokens, credentials)
- ⚙️ Configurable AI model selection
- 🔐 Secure API key management

## Architecture

The plugin consists of two main components:

1. **Browser Extension** (`extension/`)
   - Manages UI and user interactions
   - Communicates with local backend
   - Handles web page analysis requests

2. **Python Backend** (`backend/`)
   - Processes security analysis requests
   - Manages AI model integrations
   - Handles local data processing

## Security & Privacy

- All processing happens locally
- No external data transmission
- Secure API key storage
- GDPR compliant
- Open source for transparency

## Setup

1. Install Seezo using the installation script:
```bash
# Make the script executable
chmod +x install.sh

# Run the installation script
./install.sh
```

The script will:
- Set up a Python virtual environment with Python 3.11.6
- Install all required dependencies
- Install Ollama (optional, for local AI processing)
- Generate an API key for local backend authentication
- Create necessary configuration files

2. Start the backend server:
```bash
# Activate the virtual environment
source .venv/bin/activate

# Start the server
seezo
```

3. Install the browser extension:
- Chrome:
  1. Open Chrome and go to `chrome://extensions/`
  2. Enable "Developer mode" in the top right
  3. Click "Load unpacked" and select the `extension/` directory
  4. Open the extension settings and enter the API key generated during installation

- Firefox:
  1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
  2. Click "Load Temporary Add-on"
  3. Navigate to the `extension/` directory and select any file
  4. Open the extension settings and enter the API key generated during installation

## Development

### Prerequisites
- Python 3.11 (required)
- Node.js 16+
- Modern web browser (Chrome/Firefox)

### Building
```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install extension dependencies
cd extension
npm install
npm run build
```

## License

MIT License - See LICENSE file for details 
