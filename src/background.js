
let creating; 
let offscreenDocumentCreated = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sendToTab") {
        // Forward the message to the specified tab
        // frameId (optional) targets only the frame that sent the request
        const options = Number.isInteger(message.frameId) ? { frameId: message.frameId } : {};
        chrome.tabs.sendMessage(message.tabId, message.message, options)
            .then(() => {
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error("Error sending message to tab:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }
    
    // Handle other message types...
});


async function setupOffscreenDocument(path) {
  try {
    const offscreenUrl = chrome.runtime.getURL(path);
    // Check if getContexts is available (Chrome 116+)
    if ('getContexts' in chrome.runtime) {
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
      });

      if (existingContexts.length > 0) {
        console.log("Offscreen document exists");
        return;
      }
    } else {
      // Fallback for Chrome versions before 116
      const matchedClients = await clients.matchAll();
      const existingDocument = matchedClients.some(client => client.url === offscreenUrl);

      if (existingDocument) {
        console.log("Offscreen document exists (fallback)");
        return;
      }
    }

    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: path,
        reasons: ['DOM_PARSER'],
        justification: 'required for background processing',
      });
      await creating;
      creating = null;
    }
  } catch (error) {
    if (!error.message.startsWith('Only a single offscreen'))
      throw error;
  }
}


async function createOffscreenDoc() {
  if (!offscreenDocumentCreated) {
    await setupOffscreenDocument('../src/offscreen.html');
  }
}

createOffscreenDoc();


function fetchPordaStoredSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['pordaSettings'], (result) => {
      let pordaSettings = result.pordaSettings || {};

      resolve(pordaSettings);

    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getStoredSettings') {
    (async () => {
      try {
        const settings = await fetchPordaStoredSettings();
        sendResponse({ settings });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;  // Will respond asynchronously
  }
});


let currentTab = null;

// Update currentTab when the user switches tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    currentTab = tab;
  });
});

// Update currentTab when the user switches windows
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTab = tabs[0];
    });
  }
});

// Handle tab creation
chrome.tabs.onCreated.addListener((tab) => {
  if (currentTab && currentTab.id === tab.id) {
    currentTab = tab;
  }
});


let lastQueryTime = 0;
const THROTTLE_INTERVAL = 300; // 500 ms = 2 queries per second

// Function to throttle tab querying
function throttleQuery(callback) {
  const now = Date.now();
  if (now - lastQueryTime >= THROTTLE_INTERVAL) {
    lastQueryTime = now;
    callback();
  }
}

// Update currentTab when the URL of the tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0];
    //console.log("tab updated")
  });
  // throttleQuery(() => {
  //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //     currentTab = tabs[0];
  //     //console.log("tab updated")
  //   });
  // });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getCurrentTab') {
    if (!currentTab) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currTab = tabs[0];
        if (currTab?.tab) {
          currentTab = currTab;

        }
      });

    }

    sendResponse(currentTab);

    return true;  // Will respond asynchronously
  }
});


// function getCurrentTab(callback) {
//   chrome.tabs.query({ active: true, currentWindow: true }, function(activeTabs) {
//       callback(activeTabs[0]);
//   });
// }

// function updateCurrentTab() {
//   if (!currentTab?.url)
//   {
//   getCurrentTab((tabInfo) => {
//       currentTab = tabInfo;
//   });
// }
// }
// setInterval(updateCurrentTab, 500);


// Function to get the current active tab and all open tabs
function getTabInfo(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (activeTabs) {
    const currentTab = activeTabs[0];
    chrome.tabs.query({}, function (allTabs) {
      callback({ currentTab, allTabs });
    });
  });
}

// Listen for messages

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getTabInfo') {
    getTabInfo((tabInfo) => {
      sendResponse(tabInfo);
    });
    return true;  // Will respond asynchronously
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getSenderTab') {
    if (sender.tab) {
      sendResponse({
        tabId: sender.tab.id,
        url: sender.tab.url
      });
    }
  }
});


// // Function to get the current active tab
// function getCurrentTab(callback) {
//     chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
//       callback(tabs[0]);
//     });
//   }

//   // Function to get the number of open tabs
//   function getNumberOfTabs(callback) {
//     chrome.tabs.query({}, function(tabs) {
//       callback(tabs.length);
//     });
//   }

//   // Listen for a message from the popup to get the current tab and number of tabs
//   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.type === 'getTabInfo') {
//       getCurrentTab((currentTab) => {
//         getNumberOfTabs((numTabs) => {
//           sendResponse({ currentTab, numTabs });
//         });
//       });
//       return true;  // Will respond asynchronously
//     }
//   });




export function getDefaultSettings() {
  const defaultSettings = {
    pordaAppStatus: true,
    isDetectMale: false,
    isDetectFemale: true,
    isDetectAds: false,
    isDetectImage: true,
    isDetectVideo: true,

    isObjectCoverBlur: true,
    isObjectCoverColor: false,
    colorPickerValue: '#B4B4B4',
    isRoundBox: true,
    isBgImgColor: false,
    isFullImgBlur: false,
    accuracyScore: "40",
    accuracyScoreNumber: 40,

    isObjectCoverBlurVideo: true,
    isObjectCoverColorVideo: false,
    isObjectCoverBgVideo: false,
    colorPickerValueVideo: '#B4B4B4',
    isRoundBoxVideo: true,
    accuracyScoreVideo: "55",
    accuracyScoreNumberVideo: 55,

    isInitiallyImgBlur: true,
    isBlockAllImage:false,




    targetClasses: [1],
    whitelist: []

  }
  return defaultSettings;

}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://forms.gle/yQk4yesWcuv65Ruw7" }); // URL for first-time installation
  }

  chrome.storage.sync.get(['pordaSettings'], (result) => {
    let pordaSettings = result.pordaSettings;

    // If no settings are found, use default settings
    if (!pordaSettings) {
      pordaSettings = getDefaultSettings();
      // Store default settings if they were not already set
      chrome.storage.sync.set({ pordaSettings: pordaSettings }, () => {
        console.log('Default project settings saved');
      });
    } else {
      console.log('Stored project settings loaded');
    }
  });
});


chrome.runtime.onUpdateAvailable.addListener((details) => {
  const currentVersion = chrome.runtime.getManifest().version;
  const [currentMajor, currentMinor, currentPatch] = currentVersion.split('.').map(Number);
  const [updateMajor, updateMinor, updatePatch] = details.version.split('.').map(Number);

  if (updateMajor > currentMajor || updateMinor > currentMinor || updatePatch - currentPatch >= 2) {
    console.log(`Significant update available: Version ${details.version}`);
    // Open the update form URL in a new tab
    chrome.tabs.create({ url: "https://forms.gle/LnrFyZD1rDDMegX2A" });
  } else {
    console.log(`Minor update available: Version ${details.version}`);
  }

  // Reload the extension to apply the update
  chrome.runtime.reload();
});


// Set the URL to be opened on uninstallation
chrome.runtime.setUninstallURL("https://forms.gle/FsTbNJhFDguk513Q9", () => {
  if (chrome.runtime.lastError) {
    console.error(`Error setting uninstall URL: ${chrome.runtime.lastError}`);
  }
});
