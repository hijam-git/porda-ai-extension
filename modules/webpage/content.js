function fetchPordaStoredSettings() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'getStoredSettings' }, (response) => {
      if (response.settings) {
        resolve(response.settings);
      } else {
        reject(response.error || 'Error fetching settings');
      }
    });
  });
}

import {
  runObserving,
  settingsUpdate,
  settingsUpdateListner,
  getscriptsTabid,
  checkIfTabIsActive
} from "./mediaMutation";

const getSenderTabId = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'getSenderTab' }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response.tabId);
    });
  });
};


async function runCommon() {
  try {
    const settings = await fetchPordaStoredSettings();

    getSenderTabId().then(tabid => {
      if (window.self === window.top) {
        if (!settings.pordaAppStatus) {
          //console.log("Porda Extension is Off")
          return
        }

        const hostname = window.location.hostname;
        if (settings.whitelist.includes(hostname)) {
          return
        }

        if (settings.isInitiallyImgBlur){
        insertStyle()
        }

        const isSiteFacebook = hostname.includes("fb.com") || hostname.includes("facebook.com");

        settingsUpdate(settings);
        settingsUpdateListner();
        getscriptsTabid(tabid, isSiteFacebook);
        runObserving();

      }
    }).catch(error => {
      console.error('Error getting current tab ID:', error);

    });

  } catch (error) {
    console.error('Settings error:', error);
  }
}

runCommon()

function insertStyle() {
  const style = document.createElement("style");
  style.textContent = `
   img:not(.porda-checked) {
      filter: blur(15px) grayscale(90%) !important;
    }
    img.porda-filter {
      filter: blur(15px) grayscale(90%) !important;
    }
    img.porda-no-filter {
      filter: none !important;
    }
    img.porda-filter-nsfw {
      filter: blur(20px) sepia(100%) saturate(500%) hue-rotate(-50deg) !important;
    }
    img.porda-block-all-img {
      filter: opacity(0) !important;
    }
  `;
  
  if (document.documentElement) {
    document.documentElement.appendChild(style);
  } else if (document.head) {
    document.head.appendChild(style);
  } else if (document.body) {
    document.body.appendChild(style);
  } else {
    // Retry after a short delay
    setTimeout(insertStyle, 10);
    return;
  }
}

