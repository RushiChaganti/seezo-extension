// results.js - Script for the results page

document.addEventListener('DOMContentLoaded', function() {
    console.log('Results page loaded');
    
    // Send ready message to background script
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
    
    // Listen for display results message
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Results page received message:', message);
        
        if (message.type === 'DISPLAY_RESULTS' && message.data) {
            displayResults(message.data);
            sendResponse({ status: 'success' });
        }
    });
    
    // Also try to load from storage in case the message was missed
    loadResultsFromStorage();
});

function loadResultsFromStorage() {
    chrome.storage.local.get(['lastAnalysis'], function(result) {
        if (result.lastAnalysis) {
            console.log('Loaded analysis from storage:', result.lastAnalysis);
            displayResults(result.lastAnalysis);
        } else {
            console.warn('No analysis results found in storage');
            displayError('No analysis results available');
        }
    });
}

function displayResults(data) {
    console.log('Displaying results:', data);
    
    // Update URL and timestamp
    document.getElementById('analyzed-url').textContent = data.url || 'Unknown URL';
    document.getElementById('analyzed-time').textContent = formatDate(data.timestamp) || 'Unknown time';
    document.getElementById('model-used').textContent = data.model_used || 'Unknown model';
    
    // Display vulnerabilities
    const vulnContainer = document.getElementById('vulnerabilities-list');
    vulnContainer.innerHTML = '';
    
    if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        // Update vulnerability count
        const vulnCount = document.getElementById('vuln-count');
        if (vulnCount) vulnCount.textContent = data.vulnerabilities.length;
        
        data.vulnerabilities.forEach(vuln => {
            const vulnItem = document.createElement('div');
            vulnItem.className = 'vulnerability-item severity-' + (vuln.severity || 'medium').toLowerCase();
            vulnItem.innerHTML = `
                <h4>${escapeHtml(vuln.type)}</h4>
                <p>${escapeHtml(vuln.description)}</p>
                <div class="vuln-details">
                    <span class="severity">${escapeHtml(vuln.severity || 'Unknown')}</span>
                    <span class="location">${escapeHtml(vuln.location || 'Unknown location')}</span>
                </div>
            `;
            vulnContainer.appendChild(vulnItem);
        });
    } else {
        vulnContainer.innerHTML = '<p class="no-items">No vulnerabilities detected</p>';
    }
    
    // Display sensitive assets
    const assetsContainer = document.getElementById('assets-list');
    assetsContainer.innerHTML = '';
    
    if (data.sensitive_assets && data.sensitive_assets.length > 0) {
        // Update assets count
        const assetsCount = document.getElementById('assets-count');
        if (assetsCount) assetsCount.textContent = data.sensitive_assets.length;
        
        data.sensitive_assets.forEach(asset => {
            const assetItem = document.createElement('div');
            assetItem.className = 'asset-item';
            assetItem.innerHTML = `
                <h4>${escapeHtml(asset.type)}</h4>
                <p>${escapeHtml(asset.description)}</p>
                <div class="asset-location">
                    <span>${escapeHtml(asset.location || 'Unknown location')}</span>
                </div>
            `;
            assetsContainer.appendChild(assetItem);
        });
    } else {
        assetsContainer.innerHTML = '<p class="no-items">No sensitive assets detected</p>';
    }
    
    // Display recommendations
    const recsContainer = document.getElementById('recommendations-list');
    recsContainer.innerHTML = '';
    
    if (data.recommendations && data.recommendations.length > 0) {
        const recsList = document.createElement('ul');
        data.recommendations.forEach(rec => {
            const recItem = document.createElement('li');
            recItem.textContent = rec;
            recsList.appendChild(recItem);
        });
        recsContainer.appendChild(recsList);
    } else {
        recsContainer.innerHTML = '<p class="no-items">No recommendations available</p>';
    }
    
    // Update confidence score if available
    if (data.confidence_score !== undefined) {
        const confidenceElement = document.getElementById('confidence-score');
        if (confidenceElement) {
            confidenceElement.textContent = (data.confidence_score * 100).toFixed(0) + '%';
        }
    }
    
    // Show the results container
    document.getElementById('results-container').style.display = 'block';
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('error-container').style.display = 'none';
    
    // Debug output to console
    console.log('Displayed vulnerabilities:', data.vulnerabilities ? data.vulnerabilities.length : 0);
    console.log('Displayed sensitive assets:', data.sensitive_assets ? data.sensitive_assets.length : 0);
    console.log('Displayed recommendations:', data.recommendations ? data.recommendations.length : 0);
    console.log('Displayed confidence score:', data.confidence_score);
}

function displayError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('results-container').style.display = 'none';
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('error-container').style.display = 'block';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
