import { updateSettingsImgProcessing } from "./img-processing.js";
import { updateSettingsVideoProcessing } from "./video-processing.js";
import {
    observeElement,
    observeImgNode,
    observeChildNode,
    updateSettingInObserveNode,
    updateVariable,
} from "./observeNode.js";

let mutationObserver;

let scriptsTabid;
let queryIntervalId;
let isRechecking = false;

let pordaSettings = [];

const settingsUpdate = (settings) => {
    pordaSettings = settings;
    updateSettingsImgProcessing(settings);
    updateSettingsVideoProcessing(settings);
    updateSettingInObserveNode(settings);
};

const settingsUpdateListner = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type == "updateSettings") {
            sendResponse({ status: "Settings updated in observer" });
            settingsUpdate(request.updatedSettings);

            updateSettingsImgProcessing(request.updatedSettings);
            updateSettingsVideoProcessing(request.updatedSettings);
        }
        return true;
    });
};

const config = {
    childList: true, // Observe changes to child nodes
    subtree: true, // Observe the entire subtree
    attributes: true, // Observe changes to attributes
    //attributeFilter: ['src', 'srcset', 'data-src'],  // Only observe changes to these attributes
    attributeFilter: [
        "src",
        "srcset",
        "data-src",
    ],
    characterData: false, // Do not observe text changes
};
const runObserving = () => {
    // Initialize and start the MutationObserver
    const observer = new MutationObserver(handleMutations);
    const targetNode = document;
    // Function to start observing
    const initializeObserver = () => {
        if (targetNode) {
            observer.observe(targetNode, config);
            //console.log("MutationObserver started");
        } else {
            console.error("Target node is not valid. Retrying...");
            setTimeout(initializeObserver, 500); // Retry after 100ms
        }
    };

    initializeObserver(); // Start the initialization process
};

// Callback function to execute when mutations are observed
function handleMutations(mutationsList, observer) {
    mutationsList.forEach((mutation) => {
        if (mutation.type === "childList") {
            // Handle added nodes
            mutation.addedNodes.forEach((childNode) => {
                observeChildNode(childNode);
            });
        } else if (mutation.type === "attributes") {
            const { target, attributeName } = mutation;

            if (target.tagName === "IMG" || target.tagName === "VIDEO") {
                observeElement(target);
            }
        }
    });
}

const checkIfTabIsActive = async () => {
    //console.log("Scripts running on tabid", scriptsTabid);
    //return;
    if (!scriptsTabid) return;
    if (isRechecking) return;
    isRechecking = true;

    try {
        const currentTabId = await getCurrentTabId();
        //console.log('Current tab ID:', currentTabId);
        if (!currentTabId?.id) {
            return;
        }


        if (scriptsTabid === currentTabId.id) {
            if (pordaSettings.isDetectAds) {
                const imagesAndVideosAndIframes =
                    document.querySelectorAll("iframe");
                imagesAndVideosAndIframes.forEach((element) => {
                    observeIframe(element);
                });
            }

            const images = document.querySelectorAll(
                'img[data--porda-condition="request-reobserve"], img:not([data--porda-condition])'
            );
            images.forEach((img) => {
                if (img.dataset.PordaCondition) {
                    if (img.dataset.PordaCondition === "request-reobserve") {
                        img.dataset.PordaCondition = "request-reobserving";
                        //console.log("Got Request Reobserved Img in Query img goes to processing")
                        observeImgNode(img);
                    }
                }
                if (!img.dataset.PordaCondition) {
                    observeImgNode(img);
                }
            });
            //console.timeEnd("checkIfTabIsActive");
        } else {
            //console.log("Document not in focus");
        }
    } catch (error) {
        //console.error('Error getting current tab ID:', error);
        if (error.message.includes("Extension context invalidated")) {
            //It means if extension is reloaded then no longer run contensts scripts and observer
            clearInterval(queryIntervalId);
            mutationObserver?.disconnect();
            mutationObserver = null;
        }
    }
    isRechecking = false;
};

const changeQueryInterval = (newInterval) => {
    clearInterval(queryIntervalId);
    intervalId = setInterval(checkIfTabIsActive, newInterval);
    //console.log(`Interval changed to ${newInterval} milliseconds`);
};


const getscriptsTabid = (tabid, isSiteFacebook) => {
    scriptsTabid = tabid;

    if (pordaSettings.isDetectAds) {
        const imagesAndVideosAndIframes = document.querySelectorAll("iframe");
        imagesAndVideosAndIframes.forEach((element) => {
            observeIframe(element);
        });
    }
    updateVariable(isSiteFacebook);

    document.addEventListener("DOMContentLoaded", function () {
        // document.querySelectorAll('link').forEach(node => {
        //     observeScript(node);
        // });
    });

    setTimeout(() => {
        queryIntervalId = setInterval(checkIfTabIsActive, 2500);
        let firstLoad = true;

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible" && !firstLoad) {
                // The tab is in focus after a tab switch, not the initial load
                checkIfTabIsActive(); // Call your function here
            }

            // Set firstLoad to false after the first visibilitychange event
            if (firstLoad) {
                firstLoad = false;
            }
        });
    }, 2000);
};

const isInViewport = (elem) => {
  const rect = elem.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};


const intervalChecking = async () => {
  const images = Array.from(document.querySelectorAll('img:not([data--porda-condition]), img[data--under-processing="true"]'));

  const now = performance.now();
  // Filter images currently visible in the viewport
  const visibleImages = images.filter(img => {
  const isVisible = isInViewport(img);
  return isVisible ;
  });
  visibleImages.forEach((img) => {
    observeImgNode(img);
  });
};

setTimeout(() => {
    intervalChecking();
}, 10);

const getCurrentTabId = () => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "getCurrentTab" }, (response) => {
            resolve(response);
        });
    });
};


export {
    settingsUpdate,
    settingsUpdateListner,
    checkIfTabIsActive,
    getscriptsTabid,
    runObserving,
};
