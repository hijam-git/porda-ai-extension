import { sendImgForDetection } from "./img-processing.js";
import { readyVideoElementForProcessing } from "./video-processing.js";

let settignsnode = [];
let isSiteFacebook = false; // only used for video: on Facebook capture starts on "play"

export const updateSettingInObserveNode = (settign) => {
    settignsnode = settign;
};
export const updateVariable = (fbSite) => {
    isSiteFacebook = fbSite;
};

// Function to observe child nodes and process their descendants
export const observeChildNode = async (childNode) => {
    ////console.log("node Tagname",childNode.tagName);


    //if div get the image element which has no img tag/video tag inside the div element
    //Check that div has any background url
    // if it has background url process baground url dvi

    if (childNode.nodeType === Node.ELEMENT_NODE) {
        // Process all img, video, and iframe elements within the added node
        const imagesAndVideosAndIframes = childNode.querySelectorAll(
            "img, video, iframe,svg image"
        );
        imagesAndVideosAndIframes.forEach((element) => {
            observeElement(element);
        });

        // check backgorund img later version
        // if (!imagesAndVideosAndIframes.length) {
        //   observeBackgroundImg(childNode);
        // }
    }
};

export const observeElement = (node) => {
    ////console.log("node Tagname", node.tagName);

    if (node.tagName === "IMG") {
        if (node.dataset?.UnderProcessing === "true") {
            ////console.log("underprocessing")
            return;
        }
        node.dataset.PordaCondition = "CheckingByMutationObserver";
        const nodeSrc = node.hasAttribute("src")
            ? node.src
            : node.getAttribute("srcset");
        if (!(node.dataset.PordaOriginalSrc === nodeSrc)) {
            //new source update on same node... in case of youtube thumbnial
            //Now we need to consider this as a new node
            delete node.dataset?.PordaCondition;
            delete node.dataset?.pordaDone;
            delete node.dataset?.PordaResult;
            delete node.dataset?.currentTabid;
            delete node.dataset?.currentTaburl;
            node.dataset.PordaCondition =
                "CheckingByMutationObserver-NodeSrcUpdateds";
        }

        observeImgNode(node);
        return;
    }
    if (node.tagName === "VIDEO") {
        //console.log("Video found",node);
        observeVideoNode(node);
        return;
    }

    if (!settignsnode.isDetectAds) return;

    if (node.tagName === "IFRAME") {
        if (settignsnode.isDetectAds) {
            return;
        }
    }

    if (
        node.tagName.toLowerCase() === "image" &&
        node.namespaceURI === "http://www.w3.org/2000/svg"
    ) {
        // Attempt to get the dimensions from the style attribute

        if (settignsnode.isBlockAllImage) {
            //if (img.height < 30 || img.width < 30) return; //some times image width height is more but as image didnt load so it shows that width height less
            img.classlist.add("porda-block-all-img")
            return;
        }

        let width = parseFloat(node.style.width);
        let height = parseFloat(node.style.height);

        // If width or height are not set in style, fallback to attributes
        if (isNaN(width) || isNaN(height)) {
            width = parseFloat(node.getAttribute("width"));
            height = parseFloat(node.getAttribute("height"));

            // If still not valid, get the bounding box as a last resort
            if (isNaN(width) || isNaN(height)) {
                const bbox = node.getBBox(); // Get the bounding box dimensions
                width = bbox.width;
                height = bbox.height;
            }
        }
        // node.width = width;
        // node.height = height;
        // Check dimensions for your specific logic
        if (height < 60 || width < 60) {
            return;
        }
        node.dataset.svg = "observed";
        observeImgNode(node);
        return;
    }
};


export const observeImgNode = async (img) => {
    if (settignsnode.isBlockAllImage) {
        
        img.classlist.add("porda-block-all-img")
        return;
    }

    if (img.dataset.pordaDone) return;
    if (img.dataset.PordaResult) return;

    // img.classList.add("porda-filter");
    // img.classList.add("porda-checked");
    //img.dataset.PordaCondition = "ImgCheckedByPordaAi"

    let imgSrc = img.hasAttribute("src") ? img.src : img.getAttribute("srcset");
    if (!imgSrc) {
        // Check for xlink:href (for older SVGs)
        imgSrc = img.getAttributeNS("http://www.w3.org/1999/xlink", "href");

        // Check for href (for modern SVGs, SVG 2)
        if (!imgSrc) {
            imgSrc = img.getAttribute("href");
        }
    }

    if (img.naturalHeight < 2 || img.naturalWidth < 2) {
        img.addEventListener("load", recheckImage);
        // node.addEventListener('load', () => {
        //     //console.log('Image has loaded');
        // }, { once: true });
        return;
    } else if (img.height < 40 || img.width < 40) {
        ////console.log("Got Small img So ignore")
        img.style.filter = "none";
        img.dataset.PordaCondition = "ImgSmall";
         img.classList.add("porda-no-filter");
        img.classList.remove("porda-filter");

        return;
    } else if (!imgSrc) {
        //////console.log("Img Src and Srcset Not Found")
        img.dataset.PordaCondition = "request-reobserve";
        img.dataset.PordaReason = "img-src-less";
        return;
    } else {
        img.dataset.PordaCondition = "ImgReadyToProcess";
        await delay(10);
        sendImgForDetection(img, imgSrc);
        // setTimeout(()=>{

        // },10);
    }
};

export const observeVideoNode = (videoNode) => {
    // if (videoNode.clientHeight < 200) return;

    // if (videoNode.clientHeight < 200) return;
    // if (videoNode.clientWidth < 150) return;
    // if (videoNode.clientWidth < 300 && videoNode.clientHeight < 200) return;

    const checkVid = !videoNode.dataset.PordaCondition &&
        (videoNode.src?.length > 0 ||
            videoNode.getElementsByTagName("source")?.length > 0)
    //console.log(checkVid,videoNode,videoNode.src?.length,videoNode.getElementsByTagName("source")?.length);
    if (
        !videoNode.dataset.PordaCondition &&
        (videoNode.src?.length > 0 ||
            videoNode.getElementsByTagName("source")?.length > 0)
    ) {
        readyVideoElementForProcessing(videoNode, isSiteFacebook);
        // //console.log("video node")
        videoNode.dataset.PordaCondition = "Checked";
    }
};
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const recheckImage = async (event) => {
    //await delay(5);
    const targetImg = event.target;

    if (targetImg.height < 40 || targetImg.width < 40) {
        ////console.log("Got Small img So ignore")
        targetImg.dataset.PordaCondition = "ImgSmall";
        //targetImg.style.opacity = '1';
        targetImg.style.filter = "none";
       

        targetImg.classList.add("porda-no-filter");
        targetImg.classList.remove("porda-filter");
        return;
    }

    // The image that triggered the event
    if (targetImg.naturalHeight > 2 && targetImg.naturalWidth > 2) {
        targetImg.dataset.PordaCondition = "ImgReadyToProcessinrecheck";
        targetImg.dataset.PordaStep = "recheckByEventListning";
        await delay(10);
        sendImgForDetection(targetImg);
    } else {
        //targetImg.dataset.PordaCondition = "request-reobserve";
        //targetImg.dataset.PordaReason = "img-natural-height-small";
    }

    targetImg.removeEventListener("load", recheckImage); // Clean up the event listener
    //await delay(10);
    return;
};
