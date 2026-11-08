const canvToBlob = (canvas, quality) => {
    const type = "image/jpeg";

    if (canvas.convertToBlob) {
        return canvas.convertToBlob({ type, quality });
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) =>
                blob
                    ? resolve(blob)
                    : reject(new Error("Failed to convert canvas to Blob")),
            type,
            quality
        );
    });
};

let img_canvas = new OffscreenCanvas(1, 1);

let img_ctx = img_canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
});

export const replaceImgSrc = (imageNode, newSrc, isBackgroundImg = null) => {
    if (isBackgroundImg) {
        // Replace the background image source
        imageNode.style.backgroundImage = `url("${newSrc}")`;
        //console.log("backgorund generated url", newSrc);
    } else {
        const srcsetAttributesRegex = /.*srcset.*/; // Regular expression
        const srcAttributesRegex = /.*src.*/; // Regular expression

        Array.from(imageNode.attributes).forEach((attr) => {
            if (
                attr.name === "srcset" ||
                attr.name === "src" ||
                srcsetAttributesRegex.test(attr.name) ||
                srcAttributesRegex.test(attr.name)
            ) {
                imageNode.setAttribute(attr.name, newSrc); // Replace the attribute with new src
            }
        });

        //========= if there is picture element =================
        const pictureElement = imageNode.closest("picture");
        if (pictureElement) {
            const sourceElements = pictureElement.querySelectorAll("source");
            sourceElements.forEach((source) => {
                if (source.hasAttribute("srcset")) {
                    source.setAttribute("srcset", newSrc);
                }
                if (source.hasAttribute("data-srcset")) {
                    source.setAttribute("data-srcset", newSrc);
                }
            });
        }
        // For older SVGs (before SVG 2)
        if (imageNode.hasAttributeNS("http://www.w3.org/1999/xlink", "href")) {
            imageNode.setAttributeNS(
                "http://www.w3.org/1999/xlink",
                "href",
                newSrc
            );
        }
        // For SVG 2
        else if (imageNode.hasAttribute("href")) {
            imageNode.setAttribute("href", newSrc);
            //console.log("href", newSrc);
        }
    }

  
    img_ctx.clearRect(0, 0, img_canvas.width, img_canvas.height); //clean canvas
    imageNode.onload = () => {
        imageNode.dataset.pordaDone = "true";
        imageNode.dataset.PordaCondition = "Detected";
        imageNode.style.filter = "none";
        imageNode.classList.add("porda-no-filter");
        imageNode.classList.remove("porda-filter");
        URL.revokeObjectURL(newSrc); // Revoke the Blob URL after the image is loaded
    };
};

function isBlobURL(src) {
    return src.startsWith("blob:");
}

export const blurObjectImg = async (
    imageNode,
    filtered_boxes,
    xRatio,
    yRatio,
    isBackgroundImg
) => {
    //console.log("Blurring start");
    const total_box = filtered_boxes.length / 4;

    const img = new Image();
    img.setAttribute("crossorigin", "anonymous");

    let foundnoerror = false;
    let imgReachedMax = false;
    const tryLoadImage = async (src) => {
        img.src = src;

        img.onload = () => {
            let imgWidth = img.width;
            let imgHeight = img.height;

            // Define the maximum allowed dimensions
            const maxWidth = 1100;
            const maxHeight = 800;

            if (imgWidth > maxWidth || imgHeight > maxHeight) {
                const aspectRatio = imgWidth / imgHeight;
                imgReachedMax = true;
                if (imgWidth > imgHeight) {
                    imgWidth = maxWidth;
                    imgHeight = imgWidth / aspectRatio;
                } else {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * aspectRatio;
                }
            }

            // Set the canvas dimensions while preserving the aspect ratio
            img_canvas.width = imgWidth;
            img_canvas.height = imgHeight;

            if (imgReachedMax) {
                img_ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
            } else {
                img_ctx.drawImage(img, 0, 0);
            }

            for (let i = 0; i < total_box; ++i) {
                let [y1, x1, y2, x2] = filtered_boxes.slice(i * 4, (i + 1) * 4);
                x1 *= xRatio;
                x2 *= xRatio;
                y1 *= yRatio;
                y2 *= yRatio;
                const width = x2 - x1;
                const height = y2 - y1;
                //blurPartOfImg(img_ctx, x1,y1, width, height);
                blurPartOfImgUsingFilter(img_ctx, x1, y1, width, height);
            }

            //let blurredImgSrc;

            let imgQuality = 0.7;
            if (imgReachedMax) {
                imgQuality = 0.5;
            }
            canvToBlob(img_canvas, imgQuality)
                .then((blob) => {
                    const blurredImgSrc = URL.createObjectURL(blob);
                    replaceImgSrc(imageNode, blurredImgSrc, isBackgroundImg);
                    foundnoerror = true;

                    img.src = ""; // Ensure the image is unloaded
                })
                .catch((error) => {
                    //console.error("Error converting canvas to Blob:", error);
                });

            // if (imgReachedMax) {
            //   blurredImgSrc = img_canvas.toDataURL('image/jpeg', 0.5);
            // }
            // else {
            //   blurredImgSrc = img_canvas.toDataURL('image/jpeg', 0.7);
            // }
            // replaceImgSrc(imageNode, blurredImgSrc);

            // // Clean up
            // img.src = '';  // Ensure the image is unloaded
            //img = null;

            return true;
        };
    };

    img.onerror = async () => {
        if (foundnoerror) {
            return;
        }
        foundnoerror = true;
        try {
            let nodeSrc2 = imageNode.hasAttribute("src")
                ? imageNode.src
                : imageNode.getAttribute("srcset");
            //console.log(nodeSrc2);

            const response = await sendImgBackground(nodeSrc2);
            if (response === "error") return;
            await tryLoadImage(response);
        } catch (error) {
            //console.error("Image loading error:", error.message);
            // You can also perform additional error handling here
        }
    };

    let nodeSrc;
    if (isBackgroundImg) {
        const backgroundStyle =
            window.getComputedStyle(imageNode).backgroundImage;

        backgroundStyle.startsWith("url(");
        // Extract the URL from `url("...")`
        nodeSrc = backgroundStyle.slice(5, -2); // Removes 'url("' and '")'
    } else {
        nodeSrc = imageNode.hasAttribute("src")
            ? imageNode.src
            : imageNode.getAttribute("srcset");
        if (!nodeSrc) {
            // Check for xlink:href (for older SVGs)
            nodeSrc = imageNode.getAttributeNS(
                "http://www.w3.org/1999/xlink",
                "href"
            );
            // Check for href (for modern SVGs, SVG 2)
            if (!nodeSrc) {
                nodeSrc = imageNode.getAttribute("href");
            }
        }
    }

    await tryLoadImage(nodeSrc);
};
// Using canvas filter for blur faster

function blurPartOfImgUsingFilter(context, x, y, w, h) {
    const blurRadius = Math.max(parseInt(w / 20), parseInt(h / 20)); // Increase this value if needed
    const blurPasses = 2; // Number of passes to increase the blur effect

    // Create a temporary canvas to hold the part of the image to be blurred
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w + blurRadius * 2; // Increase the size to account for the blur radius
    tempCanvas.height = h + blurRadius * 2;
    const tempContext = tempCanvas.getContext("2d");

    // Draw the specified part of the main canvas onto the temporary canvas with padding for blur
    tempContext.drawImage(
        context.canvas,
        x - blurRadius,
        y - blurRadius,
        w + blurRadius * 2,
        h + blurRadius * 2,
        0,
        0,
        w + blurRadius * 2,
        h + blurRadius * 2
    );

    for (let i = 0; i < blurPasses; i++) {
        tempContext.filter = `blur(${blurRadius}px)`;
        tempContext.drawImage(tempCanvas, 0, 0);
    }

    // Draw the blurred part back onto the main canvas at the correct position
    context.drawImage(tempCanvas, blurRadius, blurRadius, w, h, x, y, w, h);

    // Cleanup
    tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height); // Clear the canvas
    tempCanvas.width = 0; // Reset dimensions to release resources
    tempCanvas.height = 0;

    // Optional: Remove the canvas if it's attached to the DOM
    if (tempCanvas.parentNode) {
        tempCanvas.remove();
    }
}

export const bgColorObjectImg = async (
    imageNode,
    filtered_boxes,
    xRatio,
    yRatio,
    isRoundBox
) => {
    //console.log("Blurring start");
    const total_box = filtered_boxes.length / 4;

    const img = new Image();
    img.setAttribute("crossorigin", "anonymous");

    let foundnoerror = false;
    let imgReachedMax = false;
    const tryLoadImage = async (src) => {
        img.src = src;

        img.onload = () => {
            let imgWidth = img.width;
            let imgHeight = img.height;

            // Define the maximum allowed dimensions
            const maxWidth = 1100;
            const maxHeight = 800;

            if (imgWidth > maxWidth || imgHeight > maxHeight) {
                const aspectRatio = imgWidth / imgHeight;
                imgReachedMax = true;
                if (imgWidth > imgHeight) {
                    imgWidth = maxWidth;
                    imgHeight = imgWidth / aspectRatio;
                } else {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * aspectRatio;
                }
            }

            // Set the canvas dimensions while preserving the aspect ratio
            img_canvas.width = imgWidth;
            img_canvas.height = imgHeight;

            if (imgReachedMax) {
                img_ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
            } else {
                img_ctx.drawImage(img, 0, 0);
            }

            const getMostFrequentColor = (
                image,
                width,
                height,
                sampleSize = 100
            ) => {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempContext = tempCanvas.getContext("2d");

                tempContext.drawImage(image, 0, 0, width, height);

                const imageData = tempContext.getImageData(0, 0, width, height);
                const data = imageData.data;

                const colorCount = {};
                let maxCount = 0;
                let mostFrequentColor = "rgba(0, 0, 0, 0)";

                for (let y = 0; y < height; y += sampleSize) {
                    //for (let x = 0; x < width; x += sampleSize) {
                    const index = y * width * 4; // (y * width + x) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];

                    const color = `rgb(${r}, ${g}, ${b})`;

                    if (!colorCount[color]) {
                        colorCount[color] = 1;
                    } else {
                        colorCount[color]++;
                    }

                    if (colorCount[color] > maxCount) {
                        maxCount = colorCount[color];
                        mostFrequentColor = color;
                    }
                    //}
                }

                // Cleanup
                tempContext.clearRect(
                    0,
                    0,
                    tempCanvas.width,
                    tempCanvas.height
                ); // Clear the canvas
                tempCanvas.width = 0; // Reset dimensions to release resources
                tempCanvas.height = 0;

                // Optional: Remove the canvas if it's attached to the DOM
                if (tempCanvas.parentNode) {
                    tempCanvas.remove();
                }

                // Clean up
                img.src = ""; // Ensure the image is unloaded

                return mostFrequentColor;
            };

            const mostFrequentColor = getMostFrequentColor(
                img,
                img_canvas.width,
                img_canvas.height
            );

            for (let i = 0; i < total_box; ++i) {
                let [y1, x1, y2, x2] = filtered_boxes.slice(i * 4, (i + 1) * 4);
                x1 *= xRatio;
                x2 *= xRatio;
                y1 *= yRatio;
                y2 *= yRatio;
                const width = x2 - x1;
                const height = y2 - y1;
                img_ctx.fillStyle = mostFrequentColor;

                if (isRoundBox) {
                    drawRoundedRect(
                        img_ctx,
                        x1,
                        y1,
                        width,
                        height,
                        parseInt(width / 20)
                    );
                } else {
                    img_ctx.fillRect(x1, y1, width, height);
                }
            }

            // let bgcolorImgSrc;
            // if (imgReachedMax) {
            //   bgcolorImgSrc = img_canvas.toDataURL('image/jpeg', 0.5);
            // }
            // else {
            //   bgcolorImgSrc = img_canvas.toDataURL('image/jpeg', 0.7);
            // }
            // replaceImgSrc(imageNode, bgcolorImgSrc);

            let imgQuality = 0.7;
            if (imgReachedMax) {
                imgQuality = 0.5;
            }
            canvToBlob(img_canvas, imgQuality)
                .then((blob) => {
                    const bgcolorImgSrc = URL.createObjectURL(blob);

                    // Call replaceImgSrc with the generated URL
                    replaceImgSrc(imageNode, bgcolorImgSrc);
                    foundnoerror = true;

                    // Clean up
                    img.src = ""; // Ensure the image is unloaded
                })
                .catch((error) => {
                    //console.error("Error converting canvas to Blob:", error);
                });

            return true;
        };
    };

    img.onerror = async () => {
        if (foundnoerror) {
            return;
        }
        foundnoerror = true;

        let nodeSrc2 = imageNode.hasAttribute("src")
            ? imageNode.src
            : imageNode.getAttribute("srcset");
        const imgInfo = {
            src: nodeSrc2,
        };

        const response = await sendImgBackground(nodeSrc2);
        if (response === "error") return;
        await tryLoadImage(response);
    };

    let nodeSrc;
    nodeSrc = imageNode.hasAttribute("src")
        ? imageNode.src
        : imageNode.getAttribute("srcset");
    if (!nodeSrc) {
        // Check for xlink:href (for older SVGs)
        nodeSrc = imageNode.getAttributeNS(
            "http://www.w3.org/1999/xlink",
            "href"
        );
        // Check for href (for modern SVGs, SVG 2)
        if (!nodeSrc) {
            nodeSrc = imageNode.getAttribute("href");
        }
    }
    await tryLoadImage(nodeSrc);
};

export const colorObjectImg2 = (
    imageNode,
    filtered_boxes,
    xRatio,
    yRatio,
    isRoundBox,
    colorValue
) => {
    //console.log("Blurring start");
    const total_box = filtered_boxes.length / 4;

    const img = new Image();
    img.setAttribute("crossorigin", "anonymous");

    let imgReachedMax = false;
    img.onload = () => {
        let imgWidth = img.width;
        let imgHeight = img.height;

        // Define the maximum allowed dimensions
        const maxWidth = 1100;
        const maxHeight = 800;

        if (imgWidth > maxWidth || imgHeight > maxHeight) {
            const aspectRatio = imgWidth / imgHeight;
            imgReachedMax = true;
            if (imgWidth > imgHeight) {
                imgWidth = maxWidth;
                imgHeight = imgWidth / aspectRatio;
            } else {
                imgHeight = maxHeight;
                imgWidth = imgHeight * aspectRatio;
            }
        }

        // Set the canvas dimensions while preserving the aspect ratio
        img_canvas.width = imgWidth;
        img_canvas.height = imgHeight;

        if (imgReachedMax) {
            img_ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
        } else {
            img_ctx.drawImage(img, 0, 0);
        }

        for (let i = 0; i < total_box; ++i) {
            let [y1, x1, y2, x2] = filtered_boxes.slice(i * 4, (i + 1) * 4);
            x1 *= xRatio;
            x2 *= xRatio;
            y1 *= yRatio;
            y2 *= yRatio;
            const width = x2 - x1;
            const height = y2 - y1;
            img_ctx.fillStyle = colorValue; //'rgba(0, 255, 0, 0.5)';
            if (isRoundBox) {
                drawRoundedRect(img_ctx, x1, y1, width, height, 10);
            } else {
                img_ctx.fillRect(x1, y1, width, height);
            }
        }
        let colorImgSrc;

        // if (imgReachedMax) {
        //   colorImgSrc = img_canvas.toDataURL('image/jpeg', 0.5);
        // }
        // else {
        //   colorImgSrc = img_canvas.toDataURL('image/jpeg', 0.7);
        // }

        //console.log(img_canvas.width, img_canvas.height);
        //console.log(img_ctx.getImageData(0, 0, img_canvas.width, img_canvas.height) );

        canvToBlob(img_canvas, imgQuality)
            .then((blob) => {
                //console.log(blob);
                const colorImgSrc = URL.createObjectURL(blob);
                //console.log(colorImgSrc); // Use this URL to set the src of an <img> element or for other purposes
            })
            .catch((error) => {
                //console.error("Error converting canvas to Blob:", error);
            });

        imageNode.dataset.PordaResult = "going to replaceimgsrc";
        replaceImgSrc(imageNode, colorImgSrc);

        // Clean up
        img.src = ""; // Ensure the image is unloaded
        //img = null;

        return true;
    };

    let nodeSrc = imageNode.hasAttribute("src")
        ? imageNode.src
        : imageNode.getAttribute("srcset");
    img.src = nodeSrc;
};

const sendImgBackground = (img) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: "makeImgUrl", image: img },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            }
        );
    });
};

const loadImageWithoutCORS = (imgSrc) => {
    const img = new Image();
    img.src = imgSrc;

    img.onload = () => {
        //console.log("Image loaded successfully without CORS.");
        document.body.appendChild(img); // Append to DOM for visual confirmation
        processImage(imgSrc); // Call to process the image
    };

    img.onerror = () => {
        //console.error("Error loading image without CORS.");
    };
};

export const colorObjectImg = async (
    imageNode,
    filtered_boxes,
    xRatio,
    yRatio,
    isRoundBox,
    colorValue
) => {
    const total_box = filtered_boxes.length / 4;

    const img = new Image();
    img.setAttribute("crossorigin", "anonymous");

    let foundnoerror = false;
    let imgReachedMax = false;
    const tryLoadImage = async (src) => {
        img.src = src;

        img.onload = () => {
            let imgWidth = img.width;
            let imgHeight = img.height;

            const maxWidth = 1100;
            const maxHeight = 800;

            if (imgWidth > maxWidth || imgHeight > maxHeight) {
                const aspectRatio = imgWidth / imgHeight;
                imgReachedMax = true;
                if (imgWidth > imgHeight) {
                    imgWidth = maxWidth;
                    imgHeight = imgWidth / aspectRatio;
                } else {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * aspectRatio;
                }
            }

            img_canvas.width = imgWidth;
            img_canvas.height = imgHeight;

            if (imgReachedMax) {
                img_ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
            } else {
                img_ctx.drawImage(img, 0, 0);
            }

            for (let i = 0; i < total_box; ++i) {
                let [y1, x1, y2, x2] = filtered_boxes.slice(i * 4, (i + 1) * 4);
                x1 *= xRatio;
                x2 *= xRatio;
                y1 *= yRatio;
                y2 *= yRatio;
                const width = x2 - x1;
                const height = y2 - y1;
                img_ctx.fillStyle = colorValue;
                if (isRoundBox) {
                    drawRoundedRect(img_ctx, x1, y1, width, height, 10);
                } else {
                    img_ctx.fillRect(x1, y1, width, height);
                }
            }

            let imgQuality = 0.7;
            if (imgReachedMax) {
                imgQuality = 0.5;
            }
            canvToBlob(img_canvas, imgQuality)
                .then((blob) => {
                    const colorImgSrc = URL.createObjectURL(blob);
                    replaceImgSrc(imageNode, colorImgSrc);
                    foundnoerror = true;
                    img.src = ""; // Unload the image
                })
                .catch((error) => {
                    //console.error("Error converting canvas to Blob:", error);
                });
        };

        img.onerror = async () => {
            if (foundnoerror) {
                return;
            }
            foundnoerror = true;

            let nodeSrc2 = imageNode.hasAttribute("src")
                ? imageNode.src
                : imageNode.getAttribute("srcset");

            const imgInfo = {
                src: nodeSrc2,
            };

            const response = await sendImgBackground(nodeSrc2);
            if (response === "error") return;
            await tryLoadImage(response);
        };
    };

    let nodeSrc;
    nodeSrc = imageNode.hasAttribute("src")
        ? imageNode.src
        : imageNode.getAttribute("srcset");
    if (!nodeSrc) {
        // Check for xlink:href (for older SVGs)
        nodeSrc = imageNode.getAttributeNS(
            "http://www.w3.org/1999/xlink",
            "href"
        );
        // Check for href (for modern SVGs, SVG 2)
        if (!nodeSrc) {
            nodeSrc = imageNode.getAttribute("href");
        }
    }
    await tryLoadImage(nodeSrc);
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
};
