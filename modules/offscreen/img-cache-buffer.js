import { detectOnImg, detectOnImg2 } from "./handleDetection.js";

export default class ImgCacheBuffer {
    constructor(pordaSettings) {
        // this.makeDetection = pordaDetect;
        this.settings = pordaSettings;

        this.cache = {}; //Can be loaded from storage
        this.limit = 2000;
        this.minCountNotToEvict = 10;
        this.minTimeNotToEvict = 120000; //2min
        this.maxTimeToEvict = 17280000; //2days

        this.savingCache = 100;
        this.savingImgCount = 0;
        this.loadCache(); //load saved cache

        this.originalImgQueue = [];
        this.loadedImgQueue = [];
        this.maxLoadedImgLimit = 20;
        this.currentLoadCount = 0;
        this.maxDetectionLimit = 1;
        this.currentDetectionCount = 0;
        this.isCurrentlyDetecting = false;

        this.isfirstDetecting = false;

        this.loadingQueue = [];
        this.detectionQueue = [];
        this.queuingStarted = false;
        this.activeProcessing = 0;
        this.activeLoading = 0;
        this.maxLoading = 50;
        this.maxProcessing = 1;
    }
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    saveCache() {
        localStorage.setItem("pordaAiImageCache", JSON.stringify(this.cache));
    }

    loadCache() {
        const cachedData = localStorage.getItem("pordaAiImageCache");
        if (cachedData) {
            this.cache = JSON.parse(cachedData);
            //console.log("============== chached Img Loaded from storage ==================");
        } else {
            this.cache = {};
        }
    }

    clearCache() {
        localStorage.removeItem("pordaAiImageCache");
    }

    getCachedImage(imageSrc) {
        const cachedItem = this.cache[imageSrc];
        if (cachedItem) {
            cachedItem[1]++; // Update access count
            cachedItem[2] = Date.now(); // Update last accessed timestamp
            return cachedItem;
        }
        return null;
    }

    getCachedImage2(imageSrc) {
        if (this.cache.hasOwnProperty(imageSrc)) {
            this.cache[imageSrc][1]++;
            this.cache[imageSrc][2] = Date.now();
            //console.log("==============IMg from chached==================");
            return this.cache[imageSrc];
        }
        return null;
    }
    async saveLastImageToCache(imageSrc, result) {
        this.savingImgCount += 1;
        if (this.savingImgCount >= this.savingCache) {
            this.saveCache();
            this.savingImgCount = 0;
            //console.log("chached Img Saving from storage");
        }

        ////console.log("==============Saving img==================");
        this.cache[imageSrc] = [result, 1, Date.now()];
        this.evictUnnecessaryImages();
    }

    evictUnnecessaryImages() {
        const cacheKeys = Object.keys(this.cache);
        if (cacheKeys.length > this.limit) {
            // Check if eviction is necessary
            const now = Date.now();
            for (const [img, [_, count, lastSeen]] of Object.entries(
                this.cache
            )) {
                const timePassed = now - lastSeen;
                if (timePassed > this.minTimeNotToEvict) {
                    if (
                        count < this.minCountNotToEvict ||
                        timePassed > this.maxTimeToEvict
                    ) {
                        delete this.cache[img];
                    }
                }
            }
        }
    }

    async saveImageToCache(imageSrc, result) {
        let isEvicted = false;

        // Check if we need to evict images
        if (Object.keys(this.cache).length >= this.limit) {
            isEvicted = this.evictImages();
            if (isEvicted) {
                // Save the image to cache if one img is removed
                this.savingImgCount += 1;
                if (this.savingImgCount >= this.savingCache) {
                    this.saveCache();
                    this.savingImgCount = 0;
                    //console.log("chached Img Saving from storage");
                }

                //console.log("==============Saving img==================");
                this.cache[imageSrc] = [result, 1, Date.now()];
            } else {
                //console.log("======== Not Saving Img Limit is full and none is evicting ==========")
            }
        } else {
            // Save the image to cache if cache is still not filled
            this.savingImgCount += 1;
            if (this.savingImgCount >= this.savingCache) {
                this.saveCache();
                this.savingImgCount = 0;
                //console.log("chached Img Saving from storage");
            }
            //console.log("============== Saving img Chacing storage is still not filled ==================");
            this.cache[imageSrc] = [result, 1, Date.now()];
        }
    }

    // evictImages() {
    // 	let let_now_time = Date.now()

    //     for (let img in this.cache) {
    // 		const lastSeen=this.cache[img][2];
    // 		const  time_passed = let_now_time-lastSeen;
    // 		if (time_passed > this.minTimeNotToEvict) {

    // 			if (this.cache[img][1] < this.minCountNotToEvict){
    // 				delete this.cache[img];
    //             	return true;
    // 			}

    // 		}
    //         // if ((this.cache[img][1] < this.minCountNotToEvict) || (time_passed > this.minTimeNotToEvict)) {
    //         //     //console.log("==============Evicting==================");
    //         //     delete this.cache[img];
    //         //     return true;
    //         // }
    //     }
    //     return false;
    // }

    getTabInfo() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: "getTabInfo" }, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(response);
            });
        });
    }
    // Function to get the current tab with Promises
    getCurrentTab() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type: "getCurrentTab" },
                (response) => {
                    resolve(response);
                }
            );
        });
    }

  

        async sendMessageToTabWebpage(img, sender, result) {
        const taskId = img.taskid;
        const tabId = sender.tab?.id;
        // console.log("offscreen send msg,",taskId,result,tabId)
       
            chrome.runtime.sendMessage({
            action: "sendToTab",
            tabId,
            message: {
                type: "imgDetectionResult",
                taskId,
                result,
            }
            });
        
        }


    async checkCache(originalImg, sender) {
        const cachedImage = this.getCachedImage(originalImg.src);
        if (cachedImage) {
            const result = [cachedImage[0], this.settings];
            // console.log("Cache hit")
            this.sendMessageToTabWebpage(originalImg,sender,result)
            return true;
        }
        return false;
    }
    async checkOnlyCache(originalImg, responseFun) {
        const cachedImage = this.getCachedImage(originalImg.src);
        if (cachedImage) {
            responseFun([cachedImage[0], this.settings]);
            return true;
        }
        responseFun(null);
        return false;
    }

    async enqueue(img, sender) {
        const isCache = await this.checkCache(img, sender);
        if (isCache) return;

        if (this.currentLoadCount >= this.maxLoadedImgLimit) {
            this.originalImgQueue.push([img, sender]);
        } else {
            this.loadThisImg(img, sender);
        }
        this.checkloadImage();
    }

    // Load an image if the load limit is not exceeded
    async checkloadImage() {
        if (
            this.originalImgQueue.length > 0 &&
            this.currentLoadCount <= this.maxLoadedImgLimit
        ) {
            this.loadThisImg(...this.originalImgQueue.shift());
        }
    }

    async loadThisImg(img, sender) {

        try {
            this.currentLoadCount++;
            const node = await this.loadImage(img.src, img.tabid, img.taburl);
            img.viewPosition
            this.loadedImgQueue.push([node, img, sender]);
             // Sort queue by viewPosition (top to bottom)
            this.loadedImgQueue.sort((a, b) => a[1].viewPosition - b[1].viewPosition);
        } catch (error) {
            const result = "error";
             this.sendMessageToTabWebpage(img,sender,[result, this.settings])
        } finally {
            this.currentLoadCount--;
            this.checkToDetectImg();
        }
    }

    async checkToDetectImg() {
        // console.log(this.currentDetectionCount);
        if (this.loadedImgQueue.length && this.currentDetectionCount < 3) {
            //} !this.isCurrentlyDetecting) {
            this.currentDetectionCount++;
            // console.log("detecting",this.currentDetectionCount);
            this.detectImg(...this.loadedImgQueue.shift());
        }
    }

    async isInCached(img) {
        const cachedImage = this.getCachedImage(img.src);
        if (cachedImage) {
            //responseFun([cachedImage[0], this.settings]);
            return true;
        }
        return false;
    }

    async detectImg(node, originalImg, sender) {
        this.isCurrentlyDetecting = true;
        //console.log("original ", this.originalImgQueue.length);
        //console.log("loadeed ", this.loadedImgQueue.length);

        //console.log(node.src)

        try {
            const currentTab = await this.getCurrentTab();
            if (!currentTab?.id) {
                //console.log("Null Current Tab",currentTab)
                const result = "request-reobserve";
                 this.sendMessageToTabWebpage(originalImg,sender,[result, this.settings])
                
            } else {
                const cachedImage = this.cache.hasOwnProperty(node.src);

                if (cachedImage) {
                     this.sendMessageToTabWebpage(originalImg,sender,["detectedAlready", this.settings])
                
                } else {
                    if (
                        node.dataset.tabid == currentTab.id &&
                        node.dataset.taburl == currentTab.url
                    ) {
                        // this.isfirstDetecting = true;
                        // console.log(this.isfirstDetecting);

                        const result = await detectOnImg(node);

                         this.sendMessageToTabWebpage(originalImg,sender,[result, this.settings])
                
                        //this.saveImageToCache(node.src, result);
                        this.saveLastImageToCache(originalImg.src, result);
                    } else {
                        //console.log("node is not in currentTab so removing node");
                        const result = "request-reobserve";
                             this.sendMessageToTabWebpage(originalImg,sender,[result, this.settings])
                
                    }
                }
            }
        } catch (error) {
            console.error("Error in detectImg in Background", error);
            const result = "error";
                 this.sendMessageToTabWebpage(originalImg,sender,[result, this.settings])
                

          
        } finally {
            //meking the generated img clear
            node.src = "";
            node = null;
            this.isCurrentlyDetecting = false;

            if (this.currentDetectionCount < 1) {
                this.currentDetectionCount = 0;
            } else {
                this.currentDetectionCount--;
            }
            this.checkToDetectImg();
            this.checkloadImage();
        }
    }

    async loadImage(imgSrc, tabid, taburl) {
        // Set the maximum dimension for resizing
        const maxDimension = 320;

        // Create an image object
        const img = new Image();
        img.setAttribute("crossorigin", "anonymous");

        // Resize image dimensions
        const resizeImage = (imgWidth, imgHeight) => {
            let newWidth = imgWidth;
            let newHeight = imgHeight;

            let maxSize = null;
            maxSize = Math.max(imgWidth, imgHeight);

            if (maxSize === imgWidth) {
                // Width is max
                newWidth = maxDimension;
                const downscaleFactor = maxSize / maxDimension;
                newHeight = Math.round(imgHeight / downscaleFactor);
            } else {
                // Height is max
                newHeight = maxDimension;
                const downscaleFactor = maxSize / maxDimension;
                newWidth = Math.round(imgWidth / downscaleFactor);
            }

            const ratio = maxSize / maxDimension;
            return { newWidth, newHeight, ratio };
        };

        return await new Promise((resolve, reject) => {
            img.onload = () => {
                let imgWidth = img.width;
                let imgHeight = img.height;

                if (imgWidth > 321 || imgHeight > 321) {
                    // Define the maximum allowed dimensions
                    const maxWidth = 1100;
                    const maxHeight = 800;

                    if (imgWidth > maxWidth || imgHeight > maxHeight) {
                        const aspectRatio = imgWidth / imgHeight;
                        if (imgWidth > imgHeight) {
                            imgWidth = maxWidth;
                            imgHeight = imgWidth / aspectRatio;
                        } else {
                            imgHeight = maxHeight;
                            imgWidth = imgHeight * aspectRatio;
                        }
                    }

                    const { newWidth, newHeight, ratio } = resizeImage(
                        imgWidth,
                        imgHeight
                    );

                    // Create a canvas to draw the resized image
                    let canvas = document.createElement("canvas");
                    let ctx = canvas.getContext("2d");
                    canvas.width = newWidth;
                    canvas.height = newHeight;

                    if (canvas.width < 2) {
                        reject(
                            "when loading img canvas width height is not as image"
                        );
                    }
                    // Draw the image onto the canvas with the new dimensions
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);

                    // Create a new image element with the resized image
                    const resizedImg = new Image();
                    resizedImg.src = canvas.toDataURL("image/jpeg", 0.7);
                    resizedImg.setAttribute("crossorigin", "anonymous");

                    // Add data attributes
                    resizedImg.dataset.tabid = tabid;
                    resizedImg.dataset.taburl = taburl;

                    if (ratio) {
                        resizedImg.dataset.ratio = ratio;
                    }

                    // Resolve with the resized image element
                    resolve(resizedImg);
                    canvas = null;
                    ctx = null;
                    img.src = "";
                } else {
                    img.dataset.tabid = tabid;
                    img.dataset.taburl = taburl;
                    resolve(img);
                }
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
    }
}
