// Content script for Seezo Security Review

class SecurityAnalyzer {
    constructor() {
        this.apiEndpoint = 'http://localhost:8000/analyze';
        this.apiKey = null;
        this.providerConfig = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Load configuration from storage
            const config = await chrome.storage.local.get(['apiKey', 'providerConfig']);
            console.log('Loaded configuration:', {
                hasApiKey: !!config.apiKey,
                providerConfig: config.providerConfig
            });

            this.apiKey = config.apiKey;
            this.providerConfig = config.providerConfig || {
                provider: 'ollama',
                model_name: 'mistral:latest'
            };

            // If no API key is configured, try to fetch it from the backend
            if (!this.apiKey) {
                console.log('No API key found in storage, attempting to fetch from backend');
                try {
                    const response = await fetch('http://localhost:8000/api-key');
                    if (response.ok) {
                        const data = await response.json();
                        this.apiKey = data.api_key;
                        // Store the API key for future use
                        await chrome.storage.local.set({ apiKey: this.apiKey });
                        console.log('API key fetched and stored successfully');
                    } else {
                        console.error('Failed to fetch API key from backend:', response.status);
                        this.showError('Failed to fetch API key. Please check if the backend server is running.');
                    }
                } catch (error) {
                    console.error('Error fetching API key:', error);
                    this.showError('Failed to fetch API key. Please check if the backend server is running.');
                }
            }

            console.log('SecurityAnalyzer initialized');
        } catch (error) {
            console.error('Failed to initialize SecurityAnalyzer:', error);
            this.showError('Failed to initialize security analyzer. Please try refreshing the page.');
        }
    }

    async analyzePage() {
        try {
            // Check if API key is configured
            if (!this.apiKey) {
                console.error('API key not configured');
                const errorMessage = 'API key not configured. Please check if the backend server is running and try again.';
                this.showError(errorMessage);
                return { 
                    status: 'error', 
                    message: 'API key not configured',
                    details: errorMessage
                };
            }

            // Get page content
            const htmlContent = document.documentElement.outerHTML;
            const url = window.location.href;

            console.log('Content script: Starting analysis');
            console.log('URL:', url);
            console.log('HTML Content length:', htmlContent.length);
            console.log('First 200 chars of HTML:', htmlContent.substring(0, 200));

            // Prepare analysis request
            const request = {
                html_content: htmlContent,
                url: url,
                context: {
                    title: document.title,
                    timestamp: new Date().toISOString()
                }
            };

            console.log('Sending request to backend:', {
                url: this.apiEndpoint,
                hasApiKey: !!this.apiKey,
                providerConfig: this.providerConfig
            });

            // Send analysis request
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({
                    request,
                    provider_config: this.providerConfig
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend response error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText
                });

                // Handle specific error cases
                if (response.status === 401) {
                    this.showError('Invalid API key. Please check your settings.');
                    return { 
                        status: 'error', 
                        message: 'Invalid API key',
                        details: 'Please check your API key in the extension settings.'
                    };
                }

                throw new Error(`Analysis failed: ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Received analysis result:', result);
            console.log('Result vulnerabilities:', result.vulnerabilities);
            console.log('Result sensitive_assets:', result.sensitive_assets);
            console.log('Result recommendations:', result.recommendations);
            
            await this.handleAnalysisResult(result);
            return { status: 'success', message: 'Analysis completed' };
        } catch (error) {
            console.error('Security analysis failed:', error);
            this.showError(error.message);
            return { status: 'error', message: error.message };
        }
    }

    async handleAnalysisResult(result) {
        try {
            console.log('Processing analysis result:', result);
            
            // Ensure we have the complete data structure
            const analysisData = {
                url: window.location.href,
                timestamp: new Date().toISOString(),
                vulnerabilities: result.vulnerabilities || [],
                sensitive_assets: result.sensitive_assets || [],
                recommendations: result.recommendations || [],
                confidence_score: result.confidence_score || 0,
                model_used: result.model_used || 'unknown'
            };
            
            console.log('Prepared analysis data:', analysisData);
            
            // Store the data in local storage first
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({
                    lastAnalysis: analysisData
                }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            console.log('Analysis data stored in local storage');
            
            // Send the result to the background script
            await chrome.runtime.sendMessage({
                type: 'ANALYSIS_RESULT',
                data: analysisData
            });
            
            // Open the results page
            await chrome.runtime.sendMessage({
                type: 'OPEN_RESULTS'
            });
            
            console.log('Analysis results sent to background script');
        } catch (error) {
            console.error('Failed to handle analysis result:', error);
            this.showError('Failed to process analysis results');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px;
            background: #f44336;
            color: white;
            border-radius: 4px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // Add a settings link if it's an API key error
        if (message.includes('API key')) {
            errorDiv.innerHTML = `
                <div style="margin-bottom: 8px;">${message}</div>
                <a href="${chrome.runtime.getURL('options.html')}" 
                   target="_blank" 
                   style="color: white; text-decoration: underline; cursor: pointer;">
                    Open Settings
                </a>
            `;
        } else {
            errorDiv.textContent = message;
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Initialize analyzer
const analyzer = new SecurityAnalyzer();

// Notify that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch (message.type) {
        case 'PING':
            sendResponse({ status: 'pong' });
            break;
            
        case 'ANALYZE_PAGE':
            analyzer.analyzePage()
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ status: 'error', message: error.message }));
            return true; // Keep the message channel open for async response
            
        case 'DISPLAY_RESULTS':
            if (message.data) {
                console.log('Received results to display:', message.data);
                // Handle the results display
                sendResponse({ status: 'success' });
            } else {
                console.error('No data received in DISPLAY_RESULTS message');
                sendResponse({ status: 'error', message: 'No data received' });
            }
            break;
            
        default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ status: 'error', message: 'Unknown message type' });
    }
}); 
