document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const providerSelect = document.getElementById('provider');
    const modelNameSelect = document.getElementById('modelName');
    const providerApiKeyInput = document.getElementById('providerApiKey');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');

    // Fetch API key from server
    try {
        console.log('Fetching API key from server...');
        const response = await fetch('http://localhost:8000/api-key');
        if (!response.ok) {
            throw new Error('Failed to fetch API key');
        }
        const data = await response.json();
        console.log('API key fetched successfully');
        apiKeyInput.value = data.api_key;
        
        // Save API key to storage
        await chrome.storage.local.set({ apiKey: data.api_key });
        console.log('API key saved to storage');
    } catch (error) {
        console.error('Error fetching API key:', error);
        showStatus('error', 'Failed to fetch API key. Make sure the backend server is running.');
        return;
    }

    // Load saved settings
    try {
        console.log('Loading saved settings...');
        const settings = await chrome.storage.local.get(['providerConfig', 'providerApiKey']);
        console.log('Loaded settings:', settings);
        
        if (settings.providerConfig) {
            providerSelect.value = settings.providerConfig.provider || 'ollama';
            modelNameSelect.value = settings.providerConfig.model_name || 'mistral:latest';
        }
        
        if (settings.providerApiKey) {
            providerApiKeyInput.value = settings.providerApiKey;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('error', 'Failed to load saved settings');
    }

    // Update model names based on selected provider
    providerSelect.addEventListener('change', async () => {
        try {
            const apiKey = apiKeyInput.value;
            const providerApiKey = providerApiKeyInput.value.trim();
            const selectedProvider = providerSelect.value;
            
            console.log('Fetching models for provider:', selectedProvider);
            console.log('Using API key:', apiKey ? 'Present' : 'Missing');
            console.log('Using provider API key:', providerApiKey ? 'Present' : 'Missing');
            
            const headers = {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            };

            // Add provider API key if available
            if (providerApiKey) {
                headers['X-Provider-Key'] = providerApiKey;
            }

            console.log('Sending request with headers:', headers);
            const response = await fetch(`http://localhost:8000/models?provider=${selectedProvider}`, {
                method: 'GET',
                headers: headers
            });

            console.log('Response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
            }

            const models = await response.json();
            console.log('Received models:', models);
            
            // Clear existing options
            modelNameSelect.innerHTML = '';
            
            // Add new options
            models.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelNameSelect.appendChild(option);
            });

            // Select the current model if it exists in the list
            const currentModel = modelNameSelect.value;
            if (models.models.includes(currentModel)) {
                modelNameSelect.value = currentModel;
            }
            console.log('Model list updated successfully');
        } catch (error) {
            console.error('Error fetching models:', error);
            showStatus('error', `Failed to fetch available models: ${error.message}`);
            modelNameSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    });

    // Save settings
    saveButton.addEventListener('click', async () => {
        try {
            saveButton.disabled = true;
            showStatus('info', 'Saving settings...');

            const settings = {
                providerConfig: {
                    provider: providerSelect.value,
                    model_name: modelNameSelect.value
                },
                providerApiKey: providerApiKeyInput.value
            };

            await chrome.storage.local.set(settings);
            showStatus('success', 'Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus('error', 'Failed to save settings');
        } finally {
            saveButton.disabled = false;
        }
    });

    // Initial load of models for default provider
    console.log('Triggering initial model load...');
    providerSelect.dispatchEvent(new Event('change'));
});

function showStatus(type, message) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Clear status after 3 seconds
    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
    }, 3000);
} 