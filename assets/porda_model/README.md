# Detection model (not included)

The trained Porda AI detection model is **not part of this repository**.
Without it the extension builds and loads, but nothing is detected and the
offscreen console shows:

```
PordaAI: could not load the detection model from "../../assets/porda_model/modelsub/model2.json".
```

## Where the model goes

The extension loads a TensorFlow.js **graph model** from:

```
assets/porda_model/modelsub/model2.json
assets/porda_model/modelsub/<weight shards referenced by model2.json>.bin
```

The path is set by `MODEL_URL` in `modules/offscreen/porda_detector.js`.

## What the model must look like

- Format: TensorFlow.js graph model (`"format": "graph-model"`)
- Input: `[1, 320, 320, 3]`, RGB, values scaled to `0..1`
- Output: YOLO-style, `[1, 6, N]` - 4 box values (`cx, cy, w, h`) followed by
  2 class scores (class `0` = male, class `1` = female)

After the first successful load the model is cached in the browser's IndexedDB
(`porda_model104`), so later starts don't read the files again. If you replace
the model, remove the extension and load it again (or clear that IndexedDB entry).

Everything in this folder except this README is ignored by git.
