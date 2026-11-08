import {
    blurObjectImg,
    colorObjectImg,
    bgColorObjectImg,
} from "./renderBoxImg.js";
let pordaSettings = [];
const getSenderTabInfo = () => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "getSenderTab" }, (response) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(response);
        });
    });
};
export const updateSettingsImgProcessing = (settings) => {
    pordaSettings = settings;
    //console.log("setting updated in Nodeprocessing")
};
const sendImgBackground = (img) => {
    chrome.runtime.sendMessage(
        { type: "detectImg", image: img },
    )
};


async function drawImage(nodeSrc, newWidth, newHeight) {
    const imgDrawingCanva = new OffscreenCanvas(newWidth, newHeight);
    const imgDrawingCtx = imgDrawingCanva.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = nodeSrc;

    await img.decode();

    imgDrawingCtx.drawImage(img, 0, 0, newWidth, newHeight);

    try {
        // Attempting to convert the canvas to a Blob
        const blob = await imgDrawingCanva.convertToBlob({
            type: "image/jpeg", // or "image/webp" for smaller file sizes
            quality: 0.5, // A number between 0 (low quality) and 1 (high quality)
        });

        const framedataurl = URL.createObjectURL(blob);
        return framedataurl;
    } catch (error) {
        console.error(
            "Canvas is tainted due to cross-origin restrictions:",
            error
        );
        return null;
    }
}

const generateUUID = async () => {
  return crypto.randomUUID();
}

const viewPosition = (elem) => {
  const rect = elem.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};


export const sendImgForDetection = async (
    node,
    imgSrc = null,
    isBackgroundImg = null
) => {
    //node.style.opacity = '0';
    try {
        let senderTabResponse;

        senderTabResponse = await getSenderTabInfo();
        node.dataset.currentTabid = senderTabResponse.tabId;
        node.dataset.currentTaburl = senderTabResponse.url;
 
        let nodeSrc;
        if (imgSrc) {
            nodeSrc = imgSrc;
        } else {
            nodeSrc = node.hasAttribute("src")
                ? node.src
                : node.getAttribute("srcset");
            if (!nodeSrc) {
                // Check for xlink:href (for older SVGs)
                nodeSrc = node.getAttributeNS(
                    "http://www.w3.org/1999/xlink",
                    "href"
                );
                // Check for href (for modern SVGs, SVG 2)
                if (!nodeSrc) {
                    nodeSrc = node.getAttribute("href");
                }
            }
        }

        node.dataset.PordaOriginalSrc = nodeSrc;

        const shouldDetectImg =
            pordaSettings.pordaAppStatus &&
            pordaSettings.isDetectImage &&
            (pordaSettings.isDetectMale || pordaSettings.isDetectFemale);
        if (!shouldDetectImg) {
            //node.style.opacity = '1';
            node.style.filter = "none";
          
            node.dataset.PordaCondition = "Detection Off";
          

        node.classList.add("porda-no-filter");
        node.classList.remove("porda-filter");
            return;
        }
        node.classList.add("porda-checked")
        node.classList.add("porda-filter")
        node.dataset.UnderProcessing = "true";
        let taskID = await generateUUID()
        if (!node.dataset.PordaTaskId) {
            node.dataset.PordaTaskId = taskID;
        }
        else{
            taskID = node.dataset.PordaTaskId;
        }
        
        const imgInfo = {
            src: nodeSrc,
            width: node.width || node.naturalWidth,
            height: node.height || node.naturalHeight,
            tabid: senderTabResponse.tabId,
            taburl: senderTabResponse.url,
            taskid: taskID,
            viewPosition: node.getBoundingClientRect().top,
        };

        sendImgBackground(imgInfo);

        node.dataset.UnderProcessing = "true";
        node.dataset.PordaCondition = "Seding to background";

    } catch (e) {
        node.dataset.PordaCondition = `Got Error while processing ${e}`;
    } 
};




chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
    if (message.type === "imgDetectionResult") {
        
        // Use setTimeout to avoid blocking and handle async operations properly
        setTimeout(() => {
            putCover(message)
        }, 0);
        
        // FIXED: Always send a response for async operations
        sendResponse({ received: true });
        return true; // Keep message channel open
    }
    
    // FIXED: Send response for unhandled message types
    sendResponse({ error: "Unknown message type" });
    return false;
});

const putCover = async (response) => {

    const taskId = response.taskId
    const finalResult = response.result
    const result = finalResult[0];
    const settings = finalResult[1];
    const isBackgroundImg = false;
    let node;
 
  node = document.querySelector(`[data--porda-task-id='${taskId}']`);
  if (!node)
  {
    // console.log("Node not found", result, "taskId:", taskId);
    return;
  }
//   console.log("Node found", result, "taskId:", taskId);


  node.dataset.UnderProcessing = "false";

    if (!settings.pordaAppStatus) {
        //node.style.opacity = '1';
        node.style.filter = "none";
       
          node.classList.add("porda-no-filter");
  node.classList.remove("porda-filter");

        node.dataset.PordaCondition = "ImgDetectionOff";
        //console.log("ImageDeetectionOff")
        return;
    }

    if (result === "detectedAlready") {
        //node.style.opacity = '1';
        node.style.filter = "none";
          node.classList.add("porda-no-filter");
  node.classList.remove("porda-filter");

     
        return;
    }
    if (result === "error") {
        delete node.dataset?.PordaCondition;
        delete node.dataset?.pordaDone;
        delete node.dataset?.PordaResult;
        delete node.dataset?.currentTabid;
        delete node.dataset?.currentTaburl;
        return;
    }

    if (false){ //result === "request-reobserve") {
        node.dataset.PordaCondition = "request-reobserve";
        node.dataset.PordaStep = "got-result-request-reobserve";
       
        delete node.dataset?.pordaDone;
        delete node.dataset?.PordaResult;
        delete node.dataset?.currentTabid;
        delete node.dataset?.currentTaburl;

        //console.log("request-reobserve")
        return;
    } else if (result === "ImageDetectionOff") {
        //node.style.opacity = '1';
                  node.classList.add("porda-no-filter");
  node.classList.remove("porda-filter");

        node.dataset.PordaCondition = "ImgDetectionOff";
        //console.log("ImageDeetectionOff")
        return;
    } else {
        let boxes_data = Object.values(result[0]);
        let scores_data = Object.values(result[1]);
        let classes_data = Object.values(result[2]);
        const ratio = Object.values(result[3]);
        let xRatio = ratio[0];
        let yRatio = ratio[1];

        let filtered_boxes = [];
        let hasObject = false;

        for (let i = 0; i < scores_data.length; ++i) {
            let score = scores_data[i] * 100;
            if (
                settings.targetClasses.includes(classes_data[i]) &&
                score > settings.accuracyScoreNumber
            ) {
                hasObject = true;
                let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);
                filtered_boxes.push(y1);
                filtered_boxes.push(x1);
                filtered_boxes.push(y2);
                filtered_boxes.push(x2);
            }
        }

        if (hasObject) {
  
        }
        if (!hasObject) {
  
        node.dataset.PordaResult = "NoTargetedObjectFound";
        node.dataset.pordaDone = "true";
        node.dataset.PordaCondition = "Detected";
        node.style.filter = "none";
        node.classList.add("porda-no-filter");
        node.classList.remove("porda-filter");
            
            return;
        } else if (
            settings.isFullImgBlur ||
            node.width < 100 ||
            node.naturalWidth < 100
        ) {
            const blurKernel = parseInt(node.width / 25);
            const blurKernel2 = blurKernel < 5 ? 5 : blurKernel;
            //node.style.opacity = '1';
                    node.style.filter = "none";
        node.classList.remove("porda-filter");
            node.style.filter = `blur(${blurKernel2}px)`;
            node.dataset.PordaResult = "FullImgBlur";
            node.dataset.PordaCondition = "Detected";
            //console.log("FullImgBlur")
            return;
        }

        else if (settings.isObjectCoverBlur) {
            await blurObjectImg(
                node,
                filtered_boxes,
                xRatio,
                yRatio,
                isBackgroundImg
            );
            node.dataset.PordaResult = "ObjectBlur";
            return;
        } else if (settings.isObjectCoverColor) {
            await colorObjectImg(
                node,
                filtered_boxes,
                xRatio,
                yRatio,
                settings.isRoundBox,
                settings.colorPickerValue
            );
            node.dataset.PordaResult = "ObjectColor";
            return;
        } else if (settings.isBgImgColor) {
            await bgColorObjectImg(
                node,
                filtered_boxes,
                xRatio,
                yRatio,
                settings.isRoundBox
            );
            node.dataset.PordaResult = "BgImgColor";
            return;
        }
        
    }
};


