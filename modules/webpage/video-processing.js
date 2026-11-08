import {
    createCanvasForVideo,
    renderBoxesForVideo,
    renderBlurBoxesForVideo,
    renderBoxesBgColorForVideo,
} from "./renderBoxVideo.js";

const minimum_delay_to_put_result = 30;
let last_capturing_time = performance.now();
const DEFAULT_DELAY_MS = 600;
const LONG_DELAY_MS = 2000;
let isProcessingFrame = false;
let delayFrameMs = DEFAULT_DELAY_MS;
let lastObjectFound = 0;
let videoFrameDrawingCanva;
let videoFrameDrawingCtx;
let pordaSettings = [];
let video_canva;
let videoNodeProcessing = [];
let currentVideo;
let idleCallbackId;
let idleCallbackIdList = [];
let animationFrameIdList = [];

export const updateSettingsVideoProcessing = (settings) => {
    pordaSettings = settings;
};

// Delay execution for a given time
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateVideoDimensions(source) {
    if (!source.videoWidth) {
        return [source.clientWidth, source.clientHeight];
    }

    const videoWidth = source.videoWidth;
    const videoHeight = source.videoHeight;
    const clientWidth = source.clientWidth;
    const clientHeight = source.clientHeight;

    const aspectRatio = videoWidth / videoHeight;

    // Calculate scaled width and height
    let scaledWidth, scaledHeight;

    // Fit by width first
    scaledHeight = clientWidth / aspectRatio;
    if (scaledHeight <= clientHeight) {
        scaledWidth = clientWidth;
    } else {
        // If height doesn't fit, fit by height instead
        scaledHeight = clientHeight;
        scaledWidth = clientHeight * aspectRatio;
    }

    return [Math.round(scaledWidth), Math.round(scaledHeight)];
}


function handleNewPlay(video) {}

function handlePlay(event) {
    const video = event.target;

    // if (video?.frameRequestId !== undefined) {
    //     console.log("Event listener Play", video.frameRequestId);
    // } else {
    //     console.log("Event listener Play - frameRequestId is undefined");
    // }

    // if (currentVideo && currentVideo !== video) {
    // 	cancelIdleCallback(video.idleCbId);
    // 	cancelAnimationFrame(video.frameRequestId);
    // 	// for (let i = idleCallbackIdList.length - 1; i >= 0; i--) {
    // 	// 	if (idleCallbackIdList[i] !== video.idleCbId) {
    // 	// 		cancelIdleCallback(idleCallbackIdList[i]);
    // 	// 		idleCallbackIdList.splice(i, 1); // Remove the element
    // 	// 	}
    // 	// }
    // 	// for (let i = animationFrameIdList.length - 1; i >= 0; i--) {
    // 	// 	if (animationFrameIdList[i] !== video.frameRequestId) {
    // 	// 		cancelAnimationFrame(animationFrameIdList[i]);
    // 	// 		animationFrameIdList.splice(i, 1); // Remove the element
    // 	// 	}
    // 	// }

    // }
    //currentVideo = video;
    //video.frameRequestId = requestAnimationFrame(() => captureVideoFrame(video));

    startsCaptutingVideo(video);
    lastObjectFound = performance.now();
}

const cancelVideoDetection = (video) => {
    // video.started = null;
    if (video?.frameRequestId) {
        cancelAnimationFrame(video.frameRequestId);
        video.frameRequestId = null;
        // console.log("animation frame id removed", video.frameRequestId)
    }
    if (video?.idleCbId) {
        cancelIdleCallback(video.idleCbId);
        video.idleCbId = null;
        // console.log("Call back video id removed", video.idleCbId)
    }
};
function handlePauseEnd(event) {
    const video = event.target;
    // console.log("Event listner pause or end", video.frameRequestId, video.idleCbId);
    cancelVideoDetection(video);
    // cancelIdleCallback(node.idleCbId);
    // console.log("animation frame id removed",idleCallbackId)
}

function addVideoListeners(video) {
    //video.addEventListener('canplay', loadVideoElement);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePauseEnd);
    video.addEventListener("ended", handlePauseEnd);
    //video.frameRequestId = null;
}

const loadVideoElement = async (video) => {
    if (video?.isLoaded) return true; //is video already loaded

    if (!video || !(video instanceof HTMLVideoElement)) {
        throw new Error("Invalid video element");
    }

    return new Promise((resolve, reject) => {
        video.setAttribute("crossorigin", "anonymous");

        if (video.readyState >= 3 && video.videoHeight > 2) {
            video.isLoaded = true;
            addVideoListeners(video);
            resolve(true);
            return;
        }
        video.onloadeddata = () => {
            if (video.videoHeight) {
                video.isLoaded = true;
                addVideoListeners(video);
                resolve(true);
            } else {
                reject(new Error("Video loaded but has no valid height"));
            }
        };

        video.onerror = () => reject(new Error("Failed to load video"));
    });
};

let enterCaptuting = false;
const startsCaptutingVideo = async (node) => {
    // if (node.started){
    //     console.log("already started capturing");
    //     return;
    // }
    // node.started = true;

    // if (node.paused || node.ended) {

    // }
    // if (enterCaptuting)
    // {
    //     node.onplay = () => {
    //         startsCaptutingVideo(node);
    //     };
    //     return;

    // }

    
    try {
        let newWidth = 0;
        let newHeight = 0;
        const result = calculateVideoDimensions(node);

        const finelWidth = result[0];
        const finelHeight = result[1];

        if (finelWidth > 320 || finelHeight > 320) {
            const maxSize = Math.max(finelWidth, finelHeight);

            if (maxSize === finelWidth) {
                // Width is max
                newWidth = 320;
                const downscaleFactor = maxSize / 320;
                newHeight = parseInt(finelHeight / downscaleFactor);
            } else {
                // Height is max
                newHeight = 320;
                const downscaleFactor = maxSize / 320;
                newWidth = parseInt(finelWidth / downscaleFactor);
            }
        } else {
            newWidth = finelWidth;
            newHeight = finelHeight;
        }

        if (!videoFrameDrawingCanva) {
            videoFrameDrawingCanva = new OffscreenCanvas(newWidth, newHeight);
            videoFrameDrawingCtx = videoFrameDrawingCanva.getContext("2d", {
                alpha: false,
                willReadFrequently: true,
            });
        }

        if (
            videoFrameDrawingCanva.width !== newWidth ||
            videoFrameDrawingCanva.height !== newHeight
        ) {
            videoFrameDrawingCanva.width = newWidth;
            videoFrameDrawingCanva.height = newHeight;
        }

        //if two video was paied.
        // if (currentVideo.src && currentVideo.src !== node.src) {
        // 	cancelVideoDetection(currentVideo)

        //     currentVideo = node;
        // }

        if (node.idleCbId) {
            //cancelVideoDetection(node);
            detectionCycle(node, newWidth, newHeight);
            // idleCallbackId = requestIdleCallback(() => {
            //     detectionCycle(node, newWidth, newHeight);
            // });
            // node.idleCbId = idleCallbackId;
        } else {
            idleCallbackId = requestIdleCallback(() => {
                detectionCycle(node, newWidth, newHeight);
            });
            node.idleCbId = idleCallbackId;
        }

        // idleCallbackIdList.push(idleCallbackId);
    } catch (e) {
        //console.log("processVideo error", e);
    }
};
export const readyVideoElementForProcessing = async (node, isfb) => {
    try {
        node.dataset.PordaCondition = "Loading";
        if (!node.isLoaded) {
            await loadVideoElement(node);
        }
        node.dataset.PordaCondition = "processing";

        if (!isfb) {
            startsCaptutingVideo(node);
        }

        // node.onplay = () => {
        //     startsCaptutingVideo(node);
        // };
    } catch (er) {}
};

// Task-id based video frame detection (same idea as images):
// each frame gets a taskId, the offscreen document answers later with a
// separate "videoFrameDetectionResult" message carrying that taskId.
const VIDEO_TASK_TIMEOUT_MS = 5000;
const pendingVideoTasks = new Map(); // taskId -> { video, frameUrl, timeoutId }

// Remove a pending task: free its blob URL and release the frame slot
const finishVideoTask = (taskId) => {
    const task = pendingVideoTasks.get(taskId);
    if (!task) return null;
    clearTimeout(task.timeoutId);
    URL.revokeObjectURL(task.frameUrl);
    pendingVideoTasks.delete(taskId);
    isProcessingFrame = false;
    return task;
};

const sendFrameBackground = (frameurl, video) => {
    const taskId = crypto.randomUUID();
    video.dataset.PordaVideoTaskId = taskId; // last frame task sent for this video

    // Safety net: if no result ever comes back (offscreen reloaded, message lost),
    // release the slot so detection keeps running.
    const timeoutId = setTimeout(
        () => finishVideoTask(taskId),
        VIDEO_TASK_TIMEOUT_MS
    );
    pendingVideoTasks.set(taskId, { video, frameUrl: frameurl, timeoutId });

    chrome.runtime.sendMessage(
        { type: "detectVideoFrame", frame: frameurl, taskid: taskId },
        () => {
            // Only an acknowledgement; the result arrives via onMessage.
            if (chrome.runtime.lastError) {
                finishVideoTask(taskId);
            }
        }
    );
};

chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "videoFrameDetectionResult") return;

    // chrome.tabs.sendMessage may reach every frame of the tab;
    // only the frame that owns this taskId handles it.
    const task = finishVideoTask(message.taskId);
    if (!task) return;

    putCoverOnVideoAsResult(message.result, task.video);
});

const detectionCycle = async (video, width, height) => {
    // console.log("in detection cycle");
    const currentTime = performance.now();
    const timediff = currentTime - last_capturing_time;

    const shouldDetectVideo =
        pordaSettings.pordaAppStatus &&
        pordaSettings.isDetectVideo &&
        (pordaSettings.isDetectMale || pordaSettings.isDetectFemale);

    if (!shouldDetectVideo) {
        delayFrameMs = 2000;
        video_canva?.clearRect(0, 0, video.clientWidth, video.clientHeight); // clean canvas
        isProcessingFrame = false;
        chrome.runtime
            .sendMessage({ type: "getSettings" })
            .then((response) => {
                // console.log(response);
                pordaSettings = response;
            })
            .catch((error) => {
                console.error("Error sending message to offscreen", error);
            });
    } else {
        delayFrameMs = DEFAULT_DELAY_MS;
    }

    //if (!video.onplay) return;

    if (videoFrameDrawingCanva.width < 2 || videoFrameDrawingCanva.height < 2) {
    } else {
        if (
            (!video.paused || !video.ended) &&
            shouldDetectVideo &&
            timediff > minimum_delay_to_put_result
        ) {
            last_capturing_time = currentTime;
            if (!isProcessingFrame) {
                try {
                    isProcessingFrame = true;
                    videoFrameDrawingCtx.drawImage(video, 0, 0, width, height);
                    const blob = await canvastoBlob(videoFrameDrawingCanva);
                    const framedataurl = URL.createObjectURL(blob);

                    // isProcessingFrame is released when the result
                    // (or timeout / send error) for this task comes back.
                    sendFrameBackground(framedataurl, video);
                } catch (er) {
                    isProcessingFrame = false;
                      console.error("Canvas is tainted, cannot create blob", er);
                    //cancelVideoDetection(video);
                }
            }
        }
    }

    const diff = currentTime - lastObjectFound;
    // if ( diff > 30000) {
    //     await delay(1000)
    // }
    // else if ( diff > 20000) {
    //     await delay(700)
    // }
    // else if ( diff > 15000) {
    //     await delay(500)
    // }
    // else if ( diff > 10000) {
    //     await delay(300)
    // }
    //console.log(diff);
    if (diff > 5000) {
        //will do later further
        await delay(delayFrameMs);
        //console.log("delied");
    }

    if (video.paused || video.ended) {
        // video.onplay = () => {
        //     video.frameRequestId = requestAnimationFrame(() =>
        //         detectionCycle(video, width, height)
        //     );
        //     // startsCaptutingVideo(video);
        // };
    } else {
        video.frameRequestId = requestAnimationFrame(() =>
            detectionCycle(video, width, height)
        );
    }
};

// Render detection result on video
const putCoverOnVideoAsResult = (response, video) => {
    if (response === "processingFrame" || response === "frameError") {
        if (video_canva) {
            video_canva.clearRect(0, 0, video.clientWidth, video.clientHeight); // clean canvas
        }
        return;
    }

    const result = response[0];
    pordaSettings = response[1];

    if (!pordaSettings.pordaAppStatus) {
        if (video_canva) {
            video_canva.clearRect(0, 0, video.clientWidth, video.clientHeight); // clean canvas
        }
        return;
    }

    let boxes_data = Object.values(result[0]);
    let scores_data = Object.values(result[1]);
    let classes_data = Object.values(result[2]);

    let filtered_boxes = [];
    let hasObject = false;

    for (let i = 0; i < scores_data.length; ++i) {
        let score = scores_data[i] * 100;
        if (
            pordaSettings.targetClasses.includes(classes_data[i]) &&
            score > pordaSettings.accuracyScoreNumberVideo
        ) {
            hasObject = true;
            lastObjectFound = performance.now();
            let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);
            filtered_boxes.push(y1);
            filtered_boxes.push(x1);
            filtered_boxes.push(y2);
            filtered_boxes.push(x2);
        }
    }

    if (!hasObject || !pordaSettings.isDetectVideo) {
        if (video_canva) {
            video_canva.clearRect(0, 0, video.clientWidth, video.clientHeight); // clean canvas
        }
        return;
    }

    video_canva = createCanvasForVideo(video);
    video_canva.clearRect(0, 0, video.clientWidth, video.clientHeight); // clean canvas

    //console.log("Video detections result", result)

    if (pordaSettings.isObjectCoverBlurVideo) {
        renderBlurBoxesForVideo(
            video_canva,
            video,
            filtered_boxes,
            video_canva.canvas.width,
            video_canva.canvas.height
        );
    } else if (pordaSettings.isObjectCoverBgVideo) {
        renderBoxesBgColorForVideo(
            video_canva,
            video,
            filtered_boxes,
            pordaSettings.isRoundBoxVideo
        );
    } else if (pordaSettings.isObjectCoverColorVideo) {
        renderBoxesForVideo(
            video_canva,
            filtered_boxes,
            pordaSettings.isRoundBoxVideo,
            pordaSettings.colorPickerValueVideo
        );
    }
};
// Convert canvas to blob
const canvastoBlob = (videoFrameCanva) => {
    const type = "image/jpeg";
    const quality = 0.7;

    if (videoFrameCanva.convertToBlob) {
        return videoFrameCanva.convertToBlob({ type, quality });
    }

    return new Promise((resolve, reject) => {
        videoFrameCanva.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("Failed to convert canvas to Blob")),
            type,
            quality
        );
    });
};

