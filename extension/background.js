// background.js

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  try {
    switch (message.type) {
      case 'ANALYSIS_RESULT':
        // Store the analysis result
        console.log('Storing analysis result:', message.data);
        chrome.storage.local.set({
          lastAnalysis: message.data
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error storing analysis result:', chrome.runtime.lastError);
            sendResponse({ status: 'error', message: 'Failed to store analysis result' });
          } else {
            console.log('Analysis result stored successfully');
            sendResponse({ status: 'success' });
          }
        });
        return true; // Keep the message channel open for async response

      case 'OPEN_RESULTS':
        // Open the results page in a new tab
        chrome.tabs.create({
          url: chrome.runtime.getURL('results.html')
        }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to create tab:', chrome.runtime.lastError);
            sendResponse({ status: 'error', message: 'Failed to create results tab' });
            return;
          }

          let contentScriptReady = false;
          let tabLoaded = false;
          let messageSent = false;
          let errorOccurred = false;
          
          // Function to check if we can send the message
          function checkAndSendMessage() {
            console.log('Checking message conditions:', {
              contentScriptReady,
              tabLoaded,
              messageSent,
              errorOccurred
            });

            if (contentScriptReady && tabLoaded && !messageSent && !errorOccurred) {
              messageSent = true;
              sendResultsToTab();
            }
          }
          
          // Listen for content script ready message
          const readyListener = (msg, sender) => {
            console.log('Received message:', msg.type, 'from tab:', sender.tab?.id);
            
            if (msg.type === 'CONTENT_SCRIPT_READY' && sender.tab?.id === tab.id) {
              console.log('Content script ready in tab:', tab.id);
              contentScriptReady = true;
              chrome.runtime.onMessage.removeListener(readyListener);
              checkAndSendMessage();
            }
          };
          
          // Set up the ready listener before anything else
          chrome.runtime.onMessage.addListener(readyListener);
          
          // Wait for the tab to load
          chrome.tabs.onUpdated.addListener(function loadListener(tabId, info) {
            console.log('Tab update:', tabId, info.status);
            
            if (tabId === tab.id && info.status === 'complete') {
              console.log('Tab loaded:', tab.id);
              chrome.tabs.onUpdated.removeListener(loadListener);
              tabLoaded = true;
              
              // Store the data first
              chrome.storage.local.set({ lastAnalysis: message.data }, (error) => {
                if (error) {
                  console.error('Failed to store analysis data:', error);
                  errorOccurred = true;
                  sendResponse({ status: 'error', message: 'Failed to store analysis data' });
                  return;
                }

                console.log('Analysis data stored, injecting content script');
                
                // Then inject the content script
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: ['content.js']
                }, (injectionResults) => {
                  if (chrome.runtime.lastError) {
                    console.error('Failed to inject content script:', chrome.runtime.lastError);
                    errorOccurred = true;
                    sendResponse({ status: 'error', message: 'Failed to inject content script' });
                    return;
                  }

                  console.log('Content script injected successfully');
                  checkAndSendMessage();
                });
              });
            }
          });
          
          // Function to send results to the tab
          function sendResultsToTab() {
            let retryCount = 0;
            const maxRetries = 5;
            const retryDelay = 1000; // 1 second

            function trySendMessage() {
              if (!tab.id) {
                console.error('Tab no longer exists');
                errorOccurred = true;
                sendResponse({ status: 'error', message: 'Tab was closed' });
                return;
              }

              console.log(`Attempting to send message (attempt ${retryCount + 1}/${maxRetries + 1})`);
              
              chrome.tabs.sendMessage(tab.id, {
                type: 'DISPLAY_RESULTS',
                data: message.data
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error sending results:', chrome.runtime.lastError);
                  if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retrying message send (${retryCount}/${maxRetries})...`);
                    setTimeout(trySendMessage, retryDelay);
                  } else {
                    console.warn('Max retries reached. Page will load data from storage.');
                    sendResponse({ status: 'success' });
                  }
                } else {
                  console.log('Message sent successfully, response:', response);
                  sendResponse({ status: 'success' });
                }
              });
            }

            // Start the retry mechanism
            setTimeout(trySendMessage, retryDelay);
          }

          // Set a timeout to ensure we don't wait forever
          setTimeout(() => {
            if (!messageSent && !errorOccurred) {
              console.warn('Timeout reached. Page will load data from storage.');
              chrome.runtime.onMessage.removeListener(readyListener);
              sendResponse({ status: 'success' });
            }
          }, 10000); // 10 second timeout
        });
        return true; // Keep the message channel open for async response

      case 'ANALYZE_PAGE':
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error('Error querying tabs:', chrome.runtime.lastError);
            sendResponse({ status: 'error', message: 'Failed to query active tab' });
            return;
          }

          if (!tabs || !tabs[0]) {
            console.error('No active tab found');
            sendResponse({ status: 'error', message: 'No active tab found' });
            return;
          }

          const activeTab = tabs[0];
          console.log('Found active tab:', activeTab.id);

          // Check if backend is running before proceeding
          fetch('http://localhost:8000/health')
            .then(response => {
              if (!response.ok) {
                throw new Error('Backend server is not running');
              }
              return injectAndAnalyze();
            })
            .catch(error => {
              console.error('Backend check failed:', error);
              sendResponse({ 
                status: 'error', 
                message: 'Backend server is not running',
                details: 'Please make sure the backend server is running and try again.'
              });
            });

          function injectAndAnalyze() {
            // First inject the content script
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js']
            }, (injectionResults) => {
              if (chrome.runtime.lastError) {
                console.error('Error injecting content script:', chrome.runtime.lastError);
                sendResponse({ status: 'error', message: 'Cannot inject scripts into this page' });
                return;
              }

              console.log('Content script injected successfully');
              
              // Wait a moment for the content script to initialize
              setTimeout(() => {
                // Send the analyze message with retry mechanism
                let retryCount = 0;
                const maxRetries = 3;
                const retryDelay = 1000; // 1 second

                function trySendAnalyzeMessage() {
                  console.log(`Attempting to send analyze message (attempt ${retryCount + 1}/${maxRetries + 1})`);
                  
                  chrome.tabs.sendMessage(activeTab.id, { type: 'ANALYZE_PAGE' }, (response) => {
                    if (chrome.runtime.lastError) {
                      console.error('Error sending analyze message:', chrome.runtime.lastError);
                      if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Retrying analyze message (${retryCount}/${maxRetries})...`);
                        setTimeout(trySendAnalyzeMessage, retryDelay);
                      } else {
                        console.error('Max retries reached for analyze message');
                        sendResponse({ 
                          status: 'error', 
                          message: 'Failed to communicate with content script after multiple attempts' 
                        });
                      }
                    } else {
                      console.log('Analyze message sent successfully, response:', response);
                      
                      // Handle API key errors
                      if (response && response.status === 'error') {
                        if (response.message === 'Invalid API key') {
                          // Open options page to let user fix the API key
                          chrome.runtime.openOptionsPage();
                          sendResponse({ 
                            status: 'error', 
                            message: 'Invalid API key',
                            details: 'Please check your API key in the settings.'
                          });
                        } else if (response.message === 'API key not configured') {
                          // Try to fetch API key from backend
                          fetch('http://localhost:8000/api-key')
                            .then(response => response.json())
                            .then(data => {
                              chrome.storage.local.set({ apiKey: data.api_key }, () => {
                                // Retry the analysis
                                trySendAnalyzeMessage();
                              });
                            })
                            .catch(error => {
                              console.error('Failed to fetch API key:', error);
                              sendResponse({ 
                                status: 'error', 
                                message: 'Failed to fetch API key',
                                details: 'Please check if the backend server is running.'
                              });
                            });
                        } else {
                          sendResponse(response);
                        }
                      } else {
                        sendResponse(response || { status: 'success' });
                      }
                    }
                  });
                }

                // Start the retry mechanism
                trySendAnalyzeMessage();
              }, 500); // Wait 500ms for content script to initialize
            });
          }
        });
        return true; // Keep the message channel open for async response

      default:
        console.warn('Unknown message type:', message.type);
        sendResponse({ status: 'error', message: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error in background script:', error);
    sendResponse({ status: 'error', message: error.message });
  }
});
