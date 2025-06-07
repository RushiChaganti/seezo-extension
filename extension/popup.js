document.addEventListener('DOMContentLoaded', async () => {
    const analyzeButton = document.getElementById('analyzeButton');
    const statusDiv = document.getElementById('status');

    // Check if backend is running
    try {
        const response = await fetch('http://localhost:8000/health');
        if (!response.ok) {
            throw new Error('Backend service is not running');
        }
    } catch (error) {
        showStatus('error', 'Backend service is not running. Please start the Python backend.');
        analyzeButton.disabled = true;
        return;
    }

    // Check if API key is configured
    const config = await chrome.storage.local.get(['apiKey']);
    if (!config.apiKey) {
        showStatus('error', 'API key not configured. Please set it in the settings.');
        analyzeButton.disabled = true;
        return;
    }

    analyzeButton.addEventListener('click', () => {
        analyzeButton.disabled = true;
        showStatus('success', 'Analyzing page...');

        // Send message to background script
        chrome.runtime.sendMessage({ type: 'ANALYZE_PAGE' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending message:', chrome.runtime.lastError);
                showStatus('error', chrome.runtime.lastError.message);
                analyzeButton.disabled = false;
                return;
            }

            if (!response) {
                showStatus('error', 'No response received from background script');
                analyzeButton.disabled = false;
                return;
            }

            if (response.status === 'error') {
                showStatus('error', response.message || 'Failed to start analysis');
            } else {
                showStatus('success', 'Analysis started. Results will appear on the page.');
            }
            analyzeButton.disabled = false;
        });
    });
});

function showStatus(type, message) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
} 