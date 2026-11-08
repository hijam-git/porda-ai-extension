function calculateVideoDimensions(source) {
  if (!source.videoWidth) {
    return [
      source.clientWidth,
      source.clientHeight
    ];
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

  // Calculate padding
  const horizontalPadding = (clientWidth - scaledWidth) / 2;
  const verticalPadding = (clientHeight - scaledHeight) / 2;

  return [
    Math.round(scaledWidth),
    Math.round(scaledHeight),
    Math.round(horizontalPadding) + 'px',
    Math.round(verticalPadding) + 'px'
  ];

}

export function createCanvasForVideo(source) {
  // Check if the source element is already wrapped in a container with a canvas
  let container = source.parentNode;
  let existingCanvas = container.querySelector('canvas[porda-canva]');

  //console.log("video rop,left,width,height, clietwidth,clienheghut", source.style.top, source.style.left, source.videoWidth, source.videoHeight, source.clientWidth, source.clientHeight)
  if (existingCanvas) {
    // If a canvas already exists, reuse it
    //console.log('Reusing existing canvas');

    const result = calculateVideoDimensions(source);
    // console.log(result)
    // console.log("result left top", result[2], result[3])
  
   
    if (source.style.top && !source.style.top.endsWith("%")) {
      existingCanvas.style.top = source.style.top;
      existingCanvas.style.left = source.style.left;
    }
    else {
      existingCanvas.style.left = result[2];
      existingCanvas.style.top = result[3];

    }

    // console.log("canvas dimension");
    // console.log("canvas left, top", existingCanvas.style.left, existingCanvas.style.top);


    return existingCanvas.getContext('2d');
  }

  // If no container exists, create a new one
  if (container.tagName !== 'DIV') {
    container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'inline-block';

    // Insert container before the source element and move the source element inside the container
    source.parentNode.insertBefore(container, source);
    container.appendChild(source);
  }

  // Create a new canvas
  const canvas = document.createElement('canvas');

  canvas.setAttribute('porda-canva', true);

  canvas.style.position = 'absolute';
  const result = calculateVideoDimensions(source);
  canvas.width = result[0];
  canvas.height = result[1];
  canvas.style.left = result[2];
  canvas.style.top = result[3];



  canvas.style.pointerEvents = 'none';
  container.appendChild(canvas);
  return canvas.getContext('2d');
}

// Define tempCanvas and tempContext as global variables
const tempCanvas = document.createElement('canvas');
const tempContext = tempCanvas.getContext('2d');

export const renderBlurBoxesForVideo3 = (ctx, video, boxes_data) => {

  const modelInputSize = 320; // Assuming 320x320 is the model input size

  const maxWidth = Math.max(video.clientWidth, video.clientHeight);
  const xRatio = maxWidth / modelInputSize;
  const yRatio = maxWidth / modelInputSize;

  // First clear the canvas if needed
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Set up a semi-transparent blur layer
  ctx.backdrop_filter = 'blur(10px)'; // Set the blur effect
  //ctx.globalAlpha = 0.8; // Adjust alpha for transparency

  // Loop through each box
  for (let i = 0; i < boxes_data.length; i += 4) {
      let [y1, x1, y2, x2] = boxes_data.slice(i, i + 4);

      // Scale the box coordinates to match video dimensions
      x1 *= xRatio;
      x2 *= xRatio;
      y1 *= yRatio;
      y2 *= yRatio;

      const width = x2 - x1;
      const height = y2 - y1;

      // Draw a blurred rectangle over the specific part of the video
      ctx.fillRect(x1, y1, width, height);
  }

  // Reset the filter and transparency after drawing the blur overlay
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
};


export const renderBlurBoxesForVideo = (ctx, video, boxes_data,canva_width,canva_height) => {
  // Constants
  const modelInputSize = 320; // Assuming 320x320 is the model input size

  const maxWidth = Math.max(canva_width, canva_height);
  const xRatio = maxWidth / modelInputSize;
  const yRatio = maxWidth / modelInputSize;


  tempCanvas.width = canva_width;
  tempCanvas.height = canva_height;

  // Draw the full video frame onto the temporary canvas
  tempContext.clearRect(0, 0, tempContext.canvas.width, tempContext.canvas.height);
  tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  tempContext.filter = `blur(20px)`;
  tempContext.drawImage(tempCanvas, 0, 0);


  // Clear the main canvas before drawing
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Loop through each box and overlay the desired regions transparently
  
  //ctx.filter = `blur(20px)`;
  
  for (let i = 0; i < boxes_data.length; i += 4) {
    let [y1, x1, y2, x2] = boxes_data.slice(i, i + 4);

    x1 *= xRatio;
    x2 *= xRatio;
    y1 *= yRatio;
    y2 *= yRatio;

    const width = x2 - x1;
    const height = y2 - y1;

    // Draw the blurred part of the video frame onto the main canvas with transparency
    // for (let i = 0; i < 5; i++) {
    // ctx.filter = `blur(10px)`;
    ctx.drawImage(tempCanvas, x1, y1, width, height, x1, y1, width, height);
    //}

  }

};


export const renderBlurBoxesForVideo2 = (ctx, video, boxes_data) => {
  // Constants
  const modelInputSize = 320; // Assuming 320x320 is the model input size

  const maxWidth = Math.max(video.clientWidth, video.clientHeight);
  const xRatio = maxWidth / modelInputSize;
  const yRatio = maxWidth / modelInputSize;

  // Function to blur a part of the canvas
  function blurPartOfImgUsingFilter(context, x, y, w, h) {
    const blurPasses = 5; // Number of passes to increase the blur effect

    // Create a temporary canvas to hold the part of the image to be blurred
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w; // Increase the size to account for the blur radius
    tempCanvas.height = h;
    const tempContext = tempCanvas.getContext('2d');

    // Draw the specified part of the video frame onto the temporary canvas with padding for blur
    tempContext.drawImage(
      video,
      x, y, w, h,
      0, 0, w, h
    );

    // Apply the blur effect
    for (let i = 0; i < blurPasses; i++) {
      tempContext.filter = `blur(${Math.round(w / 20)}px)`;
      tempContext.drawImage(tempCanvas, 0, 0);
    }

    // Draw the blurred part back onto the main canvas at the correct position
    context.drawImage(
      tempCanvas,
      0, 0, w, h,  // source rectangle (blurred portion)
      x, y, w, h  // destination on the canvas
    );
  }

  // Clear the canvas before drawing
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Loop through each box and apply the blur
  for (let i = 0; i < boxes_data.length; i += 4) {
    let [y1, x1, y2, x2] = boxes_data.slice(i, i + 4);

    // Convert the box coordinates from model input size to canvas size
    x1 *= xRatio;
    x2 *= xRatio;
    y1 *= yRatio;
    y2 *= yRatio;

    const width = x2 - x1;
    const height = y2 - y1;

    // Apply the blur effect directly to the specified regions
    blurPartOfImgUsingFilter(ctx, x1, y1, width, height);
  }
};


export const renderBoxesBgColorForVideo = (ctx, video, boxes_data, isRoundBox) => {
  const total_box = boxes_data.length / 4;
  const modelInputSize = 320; // Assuming 320x320 is the model input size

  const maxWidth = Math.max(ctx.canvas.width, ctx.canvas.height);
  const xRatio = maxWidth / modelInputSize;
  const yRatio = maxWidth / modelInputSize;

  const getMostFrequentColor = (video, width, height, sampleSize = 100) => {
    // Create a temporary canvas to draw the video frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d');

    // Draw the current video frame onto the temporary canvas
    tempContext.drawImage(video, 0, 0, width, height);

    // Get the image data from the temporary canvas
    const imageData = tempContext.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Create a map to count color occurrences
    const colorCount = {};
    let maxCount = 0;
    let mostFrequentColor = 'rgba(0, 0, 0, 0)';

    // Sample pixels at intervals to speed up the process
    for (let y = 0; y < height; y += sampleSize) {
      //for (let x = 0; x < width; x += sampleSize) {
      const index = y;//(y * width + x) * 4;
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

    return mostFrequentColor;
  };


  // Get the most frequent color from the video frame
  const mostFrequentColor = getMostFrequentColor(video, ctx.canvas.width, ctx.canvas.height);

  for (let i = 0; i < total_box; ++i) {
    let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);
    x1 *= xRatio;
    x2 *= xRatio;
    y1 *= yRatio;
    y2 *= yRatio;
    const width = x2 - x1;
    const height = y2 - y1;
    ctx.fillStyle = mostFrequentColor;

    if (isRoundBox) {
      drawRoundedRect(ctx, x1, y1, width, height, parseInt(width / 20));
    } else {
      ctx.fillRect(x1, y1, width, height);
    }
  }
};


export const renderBoxesForVideo = (ctx, boxes_data, isRoundBox, boxColor) => {
  const total_box = boxes_data.length / 4;
  // ctx.fillStyle = 'rgba(192, 0, 0,0.5)';
  // ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const modelInputSize = 320; // Assuming 320x320 is the model input size
  // Use naturalWidth and naturalHeight if width and height are not set

  const maxWidth = Math.max(ctx.canvas.width, ctx.canvas.height);
  const xRatio = maxWidth / modelInputSize;
  const yRatio = maxWidth / modelInputSize;

  for (let i = 0; i < total_box; ++i) {
    let [y1, x1, y2, x2] = boxes_data.slice(i * 4, (i + 1) * 4);
    x1 *= xRatio;
    x2 *= xRatio;
    y1 *= yRatio;
    y2 *= yRatio;
    const width = x2 - x1;
    const height = y2 - y1;
    ctx.fillStyle = boxColor;

    if (isRoundBox) {
      drawRoundedRect(ctx, x1, y1, width, height, parseInt(width / 20))
    }
    else {
      ctx.fillRect(x1, y1, width, height);
    }
  }

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
}