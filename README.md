# Seezo - Browser Security Design Review Plugin

A privacy-first browser extension that leverages local AI models to analyze web interfaces for security vulnerabilities and sensitive asset exposure.

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

1. Install the Python backend:
```bash
cd backend
pip install -r requirements.txt
python setup.py install
```

2. Load the browser extension:
- Chrome: Load unpacked extension from `extension/` directory
- Firefox: Load temporary extension from `extension/` directory

3. Configure AI models:
- Open extension settings
- Add API keys for desired models
- Select default model

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