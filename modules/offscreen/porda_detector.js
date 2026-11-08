import * as tf from "./tfjs/tf.fesm.js";

// The trained detection model is NOT included in this repository.
// Place the TensorFlow.js graph model (model.json + its .bin weight shards) at
// this path before building. See assets/porda_model/README.md.
// (Resolves to <extension root>/assets/porda_model/modelsub/model2.json.)
const MODEL_URL = "../../assets/porda_model/modelsub/model2.json";

// IndexedDB key used to cache the model after the first successful load
const INDEXED_DB_MODEL_KEY = "porda_model104";

export default class PordaDetector {
  constructor(pordaSettings) {
    this._pordaModel = null;
    this.isDetecting = false;
    this.settings = pordaSettings;
    this.targetClasses = [];
    this.detectPromise = Promise.resolve();
    this.detectPromiseVideo = Promise.resolve();

    this.canvas = document.createElement('canvas'); // Create canvas once
    this.ctx = this.canvas.getContext('2d', {
      willReadFrequently: true,
    }); // Get the context once

  }


  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    // if (this.settings.isDetectMale) this.targetClasses.push(0);
    // if (this.settings.isDetectFemale) this.targetClasses.push(1);
    // this.settings.accuracyScore=parseInt(this.settings.accuracyScore)

    //console.log("settigns updated", this.settings)
  }

  get pordaModel() {
    return this._pordaModel;
  }

  
  initModel = async () => {
    this._pordaModel = {
      net: null,
      inputShape: [1, 0, 0, 3]
    };

    try {
      // Check if WebGL is supported
      if (tf.engine().backendName !== 'webgl' && tf.ENV.get('WEBGL_VERSION') > 0) {
        await tf.setBackend('webgl');
        await tf.ready();
      } else {
        // If WebGL is not supported, set CPU as the backend
        await tf.setBackend('cpu');
        await tf.ready();
      }

      try {
        // Fast path: model cached in IndexedDB from a previous run
        const loadedModel = await tf.loadGraphModel('indexeddb://' + INDEXED_DB_MODEL_KEY);
        this._pordaModel = {
          net: loadedModel,
          inputShape: loadedModel.inputs[0].shape
        };
      } catch (indexedDbError) {
        // First run: load from the extension package
        const loadedModel = await tf.loadGraphModel(MODEL_URL);

        // Warm up the model
        const dummyInput = tf.ones(loadedModel.inputs[0].shape);
        loadedModel.execute(dummyInput);
        tf.dispose(dummyInput);

        // Cache in IndexedDB for faster startup next time
        await loadedModel.save('indexeddb://' + INDEXED_DB_MODEL_KEY);

        this._pordaModel = {
          net: loadedModel,
          inputShape: loadedModel.inputs[0].shape
        };
      }
    } catch (error) {
      console.error(
        `PordaAI: could not load the detection model from "${MODEL_URL}". ` +
        "The model is not part of this repository - see assets/porda_model/README.md.",
        error
      );
    }
  };

  // Sleep function to introduce a delay
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  preprocess = (source, modelWidth, modelHeight) => {
    let xRatio, yRatio; // ratios for boxes
    //source.crossOrigin="anonymous"

    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(source);

      //console.log("source w,h", source.width, source.height)
      // padding image to square => [n, m] to [n, n], n > m
      const [h, w] = img.shape.slice(0, 2); // get source width and height
      //console.log('imgae w,h tensor', w, h)
      const maxSize = Math.max(w, h); // get max size
      const imgPadded = img.pad([
        [0, maxSize - h], // padding y [bottom only]
        [0, maxSize - w], // padding x [right only]
        [0, 0],
      ]);
      // xRatio = maxSize / w; // update xRatio
      // yRatio = maxSize / h; // update yRatio
      if (source.dataset.ratio) {
        xRatio = parseFloat(source.dataset.ratio);
        yRatio = parseFloat(source.dataset.ratio);
      }
      else {
        xRatio = maxSize / 320; // as the detection on image will be maximun 320*320
        yRatio = maxSize / 320; // update yRatio
      }

      return tf.image
        .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
        .div(255.0) // normalize
        .expandDims(0); // add batch
    });

    return [input, xRatio, yRatio];
  };

  detect2 = async (source, isImg, callback = () => { }) => {
    return new Promise(async (resolve, reject) => {
      await this.sleep(10);

      //console.time("detect");
      // const [modelWidth, modelHeight] = this._pordaModel.inputShape.slice(1, 3);
      // //console.log("model , h ", modelWidth, modelHeight);
      const modelWidth = 320;
      const modelHeight = 320;

      tf.engine().startScope();
      const [input, xRatio, yRatio] = this.preprocess(source, modelWidth, modelHeight);



      const res = this._pordaModel.net.execute(input);
      const transRes = res.transpose([0, 2, 1]);
      const boxes = tf.tidy(() => {
        const w = transRes.slice([0, 0, 2], [-1, -1, 1]);
        const h = transRes.slice([0, 0, 3], [-1, -1, 1]);
        const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2));
        const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2));
        return tf
          .concat([y1, x1, tf.add(y1, h), tf.add(x1, w)], 2)
          .squeeze();
      });

      const [scores, classes] = tf.tidy(() => {
        const rawScores = transRes.slice([0, 0, 4], [-1, -1, 2]).squeeze(0);
        return [rawScores.max(1), rawScores.argMax(1)];
      });

      const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2);

      const boxes_data = boxes.gather(nms, 0).dataSync();
      const scores_data = scores.gather(nms, 0).dataSync();
      const classes_data = classes.gather(nms, 0).dataSync();
      let returnValues;
      returnValues = [boxes_data, scores_data, classes_data, [xRatio, yRatio]];


      tf.dispose([res, transRes, boxes, scores, classes, nms]);
      callback();

      tf.engine().endScope();


      //console.log("porda detector ", returnValues);

      //console.timeEnd("detect");

      resolve(returnValues);
    });

  };

  detect = async (source, isImg, callback = () => { }) => {
    this.detectPromise = this.detectPromise.then(async () => {
      await this.sleep(5);

      //console.time("detect");
      // const [modelWidth, modelHeight] = this._pordaModel.inputShape.slice(1, 3);
      // //console.log("model , h ", modelWidth, modelHeight);
      const modelWidth = 320;
      const modelHeight = 320;

      tf.engine().startScope();
      const [input, xRatio, yRatio] = this.preprocess(source, modelWidth, modelHeight);



      const res = this._pordaModel.net.execute(input);
      const transRes = res.transpose([0, 2, 1]);
      const boxes = tf.tidy(() => {
        const w = transRes.slice([0, 0, 2], [-1, -1, 1]);
        const h = transRes.slice([0, 0, 3], [-1, -1, 1]);
        const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2));
        const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2));
        return tf
          .concat([y1, x1, tf.add(y1, h), tf.add(x1, w)], 2)
          .squeeze();
      });

      const [scores, classes] = tf.tidy(() => {
        const rawScores = transRes.slice([0, 0, 4], [-1, -1, 2]).squeeze(0);
        return [rawScores.max(1), rawScores.argMax(1)];
      });

      const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2);

      const boxes_data = boxes.gather(nms, 0).dataSync();
      const scores_data = scores.gather(nms, 0).dataSync();
      const classes_data = classes.gather(nms, 0).dataSync();
      let returnValues;
      returnValues = [boxes_data, scores_data, classes_data, [xRatio, yRatio]];


      tf.dispose([res, transRes, boxes, scores, classes, nms]);
      callback();

      tf.engine().endScope();


      //console.log("porda detector ", returnValues);

      //console.timeEnd("detect");

      return returnValues;
    });

    return this.detectPromise;
  };


};
