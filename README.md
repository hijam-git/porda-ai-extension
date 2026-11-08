# Welcome to Porda AI Extension!

Introducing **Porda AI**, an innovative application designed to be your everyday AI companion, empowering the Muslim community to maintain modesty in the digital realm by blurring and covering non-mahram and haram objects in your browser.

In today’s digital landscape, encountering haram and non-mahram content in images and videos is a significant challenge. Whether browsing social media, news portals, watching documentaries, or simply surfing the web, non-mahram content can appear unexpectedly. According to Islamic teachings, gazing upon non-mahram content is strictly haram, yet avoiding it can be difficult in the digital age.

By the grace of Allah 💚, we have developed the world’s first advanced AI solution. This cutting-edge technology automatically blurs haram objects in real-time, protecting you and your family from unwelcome content in videos and images.

> **About this repository**
>
> This repository contains an **initial version** of the Porda AI Extension, released as open source.
> It is **not** the version currently on the Chrome Web Store. The current store version is different and is not open-source at this time.
>
> The trained AI model is **not included** here (see [Build From Source](#build-from-source)).


## Try Porda AI App That Works Directly on Screen

💻 **Computer App version**: [Porda AI on GitHub](https://github.com/hijam-git/Porda-AI)

![Screenshot](github_static/readme_images/1.png)
![Screenshot](github_static/readme_images/2.png)
![Screenshot](github_static/readme_images/3.png)
![Screenshot](github_static/readme_images/4.png)
![Screenshot](github_static/readme_images/5.png)

## Features of Porda AI

💠 **100% Secure:**
- Runs entirely offline; no data is sent or stored externally.
- Ensures user privacy and data security.

💠 **User-Friendly Interface:**
- Intuitive design for easy navigation and settings adjustment.

💠 **Instant On/Off Toggle:**
- Enable or disable the extension without needing to reload the page.

💠 **Dynamic Settings Adjustment:**
- Change settings anytime without requiring a page reload.

💠 **Personalization for Websites:**
- Activate or deactivate detection for specific websites.
- Customizable whitelist/blacklist for sites.

💠 **Separate Settings for Images and Videos:**
- Independent settings for image detection and video detection.
- Customize detection preferences for each type of media.

💠 **Various Covering Options for Your Vision Comfort:**
- Blur, solid color, full blur, and background color (Bg color) for covering haram objects.

💠 **Fast Detection:**
- Detects and blurs haram objects as soon as the image or video is loaded, ensuring a smooth user experience.

💠 **Strong Caching Mechanism:**
- Dynamic and efficient caching for faster performance.

💠 **Optimization for High Accuracy:**
- Advanced AI trained with extensive custom data for precise detection of haram objects.
- Regular updates to improve detection accuracy.

💠 **Optimal Halal Vision:**
- Ensures maximum coverage of haram objects while preserving surrounding content (text, subtitles, etc.).
- Enhances user experience by showing as much of the halal surrounding content as possible.

💠 **Low Resource Consumption:**
- Optimized to run efficiently on both desktop and mobile devices, ensuring it does not slow down your device or impact other tasks.

## Limitations

- Initially, we focused on publishing the project as a Minimum Viable Product (MVP), so there are some limitations.
- We've prioritized detecting common objects first. As a result, the extension may not accurately detect more complex objects.
- The extension works well with images, but video detection may not be perfect for every frame. You can turn off video detection if needed.
- The extension works on most websites, but there are a few where it may not function correctly. Detection can be turned off on those sites.
- For Android, a third-party app (Kiwi) is needed, which may limit functionality. We are actively developing a dedicated version for Android.
- We are actively working to resolve these issues and regularly update the extension to improve its performance.

## Tips

- For the best experience, use the Chrome browser.
- If you don't need detection on a particular website, you can turn off detection for that site in the settings.
- Use the Porda AI app on your computer for direct screen integration on any app.
- For optimal performance, keep the accuracy setting at 40% or lower.
- If it suddenly stops working, simply reload the extension.

## Download Here
- **Porda Ai Extension:** [Porda Ai on Chrome Web Store](https://chromewebstore.google.com/detail/pordaai-realtime-haramblu/ofhlminijomemliahkjjbgcbfoimjiaj)

## Build From Source

> **Note:** The trained AI model is **not included** in this repository.
> The code builds and loads without it, but nothing will be detected.
> See [`assets/porda_model/README.md`](assets/porda_model/README.md) for where the model goes and what format it needs.

1. Install [Node.js](https://nodejs.org/) (v18 or newer).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the content script and the offscreen (AI) script:
   ```bash
   npm run build
   npm run build_offscreen
   ```
   This creates the `scripts/` folder.
4. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select this folder.

### Project structure

| Path | What it does |
|---|---|
| `src/background.js` | Service worker: stores settings, creates the offscreen document, forwards results to tabs |
| `modules/offscreen/` | Runs the AI model (TensorFlow.js) on images and video frames |
| `modules/webpage/` | Content script: finds images/videos on the page, sends them for detection, draws the blur |
| `src/popup/` | Settings popup |

Images and video frames are sent to the offscreen document with a **task ID**; the result comes back as a separate message carrying the same ID, so the page knows which image or video it belongs to.

## 📄 License

This project is licensed under the [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html).
See the [LICENSE](./LICENSE) file for details.

## Acknowledgements

### Porda AI Desktop
Porda AI Desktop is built entirely in-house by the Porda AI team.

### Porda AI Extension

These projects helped us learn how to implement our model on the web and
encouraged us to keep going. We are grateful to them:

- **[mgradyn](https://github.com/mgradyn)**
- **[juanjaho / real-time-object-detection-web-app](https://github.com/juanjaho/real-time-object-detection-web-app)**
- **[vladmandic / human](https://github.com/vladmandic/human)**
- **[Hyuto / yolov8-tfjs](https://github.com/Hyuto/yolov8-tfjs)**

The **[HaramBlur](https://github.com/alganzory/HaramBlur)** repo helped us learn how
to build and understand a browser extension. We used some of its functions
initially, though our model and many of our systems were different.

The current Porda AI Extension (the version on the Chrome Web Store) is entirely
different from all of the projects above. It is not open-source at this time.
This repository contains only an initial version.

## Contact Us

Feel free to reach out to us:

- **Email:** [hijamweb@gmail.com](mailto:hijamweb@gmail.com)
- **Facebook:** [Abdullah](https://facebook.com/abdullah.holy)
- **LinkedIn:** [Hijam Ibna Omar](https://www.linkedin.com/in/hijamibnaomar/)
- **Phone (Bkash/Nagad/Whatsapp):** 01823170383
- **Feedback Form:** [Feedback Form](https://forms.gle/uKoWWYATQvLBHhkN9)

Thank you for using Porda AI, and may Allah bless you with protection and guidance in the digital realm.
