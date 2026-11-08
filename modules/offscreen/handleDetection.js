
import ImgCacheBuffer from "./img-cache-buffer.js";
import PordaDetector from "./porda_detector.js";

let pordaSettings;
let imgBuffer;
let porda;
let porda2;
let isProcessingCurrentFram = false;
let videoFrameImage = new Image();


export function fetchPordaStoredSettings() {
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

export function updateOffscreenSetting(settings) {
	pordaSettings=settings;

	porda.updateSettings(settings);
	imgBuffer.updateSettings(settings);
}

export const setupDetection = async () => {
	pordaSettings = await fetchPordaStoredSettings();
	porda = new PordaDetector(pordaSettings)
	//porda2 = new PordaDetector2(pordaSettings)
	try {
		await porda.initModel();
		//await porda2.initModel();
		//console.log("Porda Ai Model loaded");
	} catch (error) {
		//console.log("Error loading models", error);
		//chrome.runtime.sendMessage({ type: "reloadExtension" });
		return;
	}

	imgBuffer = new ImgCacheBuffer(pordaSettings);

}

export const checkCacheImg = (request, sender, sendResponse) => {
	imgBuffer.checkOnlyCache(request.image, (result) => { sendResponse(result) })
}

export const detectTheImage = (request, sender) => {
	imgBuffer.enqueue(request.image,sender)
}

// Send a video frame result back to the tab/frame that asked, tagged with its taskId
const sendVideoResultToTab = (request, sender, result) => {
	chrome.runtime.sendMessage({
		action: "sendToTab",
		tabId: sender.tab?.id,
		frameId: sender.frameId,
		message: {
			type: "videoFrameDetectionResult",
			taskId: request.taskid,
			result,
		},
	});
};

export const handleVideoFrame = async (request, sender, sendResponse) => {
	const framedataurl = request.frame;
	// Acknowledge right away; the real result is sent later with the taskId.
	sendResponse({ status: "Video frame detection started" });

	if (isProcessingCurrentFram) {
		sendVideoResultToTab(request, sender, "processingFrame");
		return;
	}
	isProcessingCurrentFram = true;

	videoFrameImage.onload = () => {
		detectOnVideoFrame(videoFrameImage)
			.then((result) => {
				isProcessingCurrentFram = false;
				sendVideoResultToTab(request, sender, result);
			})
			.catch((e) => {
				//console.log("PordaAi - error in detectImage", e);
				isProcessingCurrentFram = false;
				sendVideoResultToTab(request, sender, "frameError");
			})
			.finally(() => {
				// Cleanup image
				videoFrameImage.src = ""; // Clear the image source
				//frameImage = null; // Release the image object
			});

		//frameImage.src = ""; //clear memeory
	};
	videoFrameImage.onerror = (e) => {

		isProcessingCurrentFram = false;
		sendVideoResultToTab(request, sender, "frameError");
	};
	videoFrameImage.src = framedataurl;
};


const detectOnVideoFrame = async (frame) => {
	isProcessingCurrentFram = true

	let porda_result;

	if (!pordaSettings.isDetectVideo || !pordaSettings.pordaAppStatus) {
		porda_result = "VideoDetectionOff";
	}
	else {
		isProcessingCurrentFram = true;
		porda_result = await porda.detect(frame, false);
	}
	return [porda_result, pordaSettings];

}
 export const  detectOnImg = async (img) => {
	let porda_result;
	const shouldDetectImg = (pordaSettings.pordaAppStatus && pordaSettings.isDetectImage && (pordaSettings.isDetectMale || pordaSettings.isDetectFemale));
	if (!shouldDetectImg) {
		porda_result = "ImageDetectionOff";
	}
	else {
		porda_result = await porda.detect(img, true);
	}
	return porda_result;
}

export const  detectOnImg2 = async (img) => {
	console.log("detect2")
	let porda_result;
	const shouldDetectImg = (pordaSettings.pordaAppStatus && pordaSettings.isDetectImage && (pordaSettings.isDetectMale || pordaSettings.isDetectFemale));
	if (!shouldDetectImg) {
		porda_result = "ImageDetectionOff";
	}
	else {
		porda_result = await porda2.detect(img, true);
	}
	return porda_result;
}





