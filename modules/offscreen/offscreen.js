import {setupDetection, detectTheImage,checkCacheImg, handleVideoFrame, updateOffscreenSetting,fetchPordaStoredSettings } from "./handleDetection.js"
let pordaSettings;


  

const offscreenListening = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.type) {
            case "detectImg":
                detectTheImage(request, sender);
                
                sendResponse({ status: "Image detection started" });
                // console.log("Got message from detectImg ")
                break;
            case "checkCacheImg":
                checkCacheImg(request, sender, sendResponse);
                break;
            case "detectVideoFrame":
                handleVideoFrame(request, sender, sendResponse);
                break;
            case "updateSettings":
                pordaSettings = request.updatedSettings;
                delete pordaSettings.whitelist;
                updateOffscreenSetting(pordaSettings)
                sendResponse({ status: "Settings updated in offscreen" });
                break;
            case "makeImgUrl":
                makeImgurl(request, sender, sendResponse);
                break;
            case "getSettings":
                sendResponse(pordaSettings);
                break;
            default:
                break;
        }
        return true;
    });
};
const startOffscreen = async () =>{
    pordaSettings = await fetchPordaStoredSettings();
    await setupDetection();
    offscreenListening();
}
startOffscreen()





const  loadImage  = async (imgSrc) =>{
    // Set the maximum dimension for resizing

    // Create an image object
    const img = new Image();
    
    return await new Promise((resolve, reject) => {
        img.onload = () => {
            let  { imgWidth, imgHeight, imgReachedMax } = resizeImg(img.width, img.height);

                
                // Create a canvas to draw the resized image
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                canvas.width = imgWidth;
                canvas.height = imgHeight;

             
                // Draw the image onto the canvas with the new dimensions
                ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

                // Create a new image element with the resized image
                const resizedImg = new Image();
                resizedImg.src = canvas.toDataURL('image/jpeg', 0.6);
                resizedImg.setAttribute("crossorigin", "anonymous");
                // Resolve with the resized image element
                resolve(resizedImg);
                canvas = null;
                ctx = null;
                img.src = '';
            
                
            
        };

        img.onerror = (e) => {
            reject(e);
        };

        // Set the source of the image
        try {
            img.src = imgSrc;
        } catch (e) {
            reject(e);
        }
    });
};



const resizeImg = (width, height) => {
    let imgWidth = width;
    let imgHeight = height;
  
    // Define the maximum allowed dimensions
    const maxWidth = 1100;
    const maxHeight = 800;
    let imgReachedMax = false;
  
    if (imgWidth > maxWidth || imgHeight > maxHeight) {
      const aspectRatio = imgWidth / imgHeight;
      imgReachedMax = true; // Update when resizing is needed
      if (imgWidth > imgHeight) {
        imgWidth = maxWidth;
        imgHeight = imgWidth / aspectRatio;
      } else {
        imgHeight = maxHeight;
        imgWidth = imgHeight * aspectRatio;
      }
    }
  
    return { imgWidth, imgHeight, imgReachedMax };
  };
  

const makeImgurl = async (request, sender, sendResponse) =>{
    //console.log(request.image)

    try {
        const imageR = request.image;
        const loadedImg = await loadImage(imageR);
        
        sendResponse((loadedImg.src)); // Send response with image src
    } catch (error) {
        sendResponse("error"); // Send error response if something goes wrong
    }
 

}

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
  }
  