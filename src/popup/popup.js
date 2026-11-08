document.addEventListener('DOMContentLoaded', () => {
    loadCheckboxStates();

    // document.getElementById('porda-status').addEventListener('click', saveCheckboxStates);
    // document.getElementById('save').addEventListener('click', saveCheckboxStates);


    // Attach event listeners to save settings automatically when they change
    document.getElementById('porda-status').addEventListener('change', saveCheckboxStates);
    document.getElementById('whitelist').addEventListener('change', saveCheckboxStates);
    document.getElementById('male').addEventListener('change', saveCheckboxStates);
    document.getElementById('female').addEventListener('change', saveCheckboxStates);
    // document.getElementById('ads').addEventListener('change', saveCheckboxStates); // Hidden: Ads blocker removed
    document.getElementById('image').addEventListener('change', saveCheckboxStates);
    document.getElementById('video').addEventListener('change', saveCheckboxStates);
    document.getElementById('object-cover-blur').addEventListener('change', saveCheckboxStates);
    document.getElementById('object-cover-color').addEventListener('change', saveCheckboxStates);
    //document.getElementById('full-img-blur').addEventListener('change', saveCheckboxStates);
    document.getElementById('full-img-color').addEventListener('change', saveCheckboxStates);
    document.getElementById('roundbox').addEventListener('change', saveCheckboxStates);
    document.getElementById('color-picker').addEventListener('input', saveCheckboxStates);
    document.getElementById('accuracy-slider').addEventListener('input', saveCheckboxStates);

    document.getElementById('object-cover-blur-video').addEventListener('change', saveCheckboxStates);
    document.getElementById('object-cover-color-video').addEventListener('change', saveCheckboxStates);
    document.getElementById('img-bg-color-video').addEventListener('change', saveCheckboxStates);
    document.getElementById('roundbox-video').addEventListener('change', saveCheckboxStates);
    document.getElementById('color-picker-video').addEventListener('input', saveCheckboxStates);
    document.getElementById('accuracy-slider-video').addEventListener('input', saveCheckboxStates);
    
    document.getElementById('initially-img-blur').addEventListener('input', saveCheckboxStates);
    document.getElementById('block-all-image').addEventListener('input', saveCheckboxStates);









    // Update slider value display
    const accuracySlider = document.getElementById('accuracy-slider');
    const accuracyValue = document.getElementById('accuracy-value');
    accuracySlider.addEventListener('input', () => {
        accuracyValue.textContent = accuracySlider.value;
    });
    // Update slider value display
    const accuracySliderVideo = document.getElementById('accuracy-slider-video');
    const accuracyValueVideo = document.getElementById('accuracy-value-video');
    accuracySliderVideo.addEventListener('input', () => {
        accuracyValueVideo.textContent = accuracySliderVideo.value;
    });
});

let loadedSettings;
function saveCheckboxStates() {
    const pordaAppStatus = document.getElementById('porda-status').checked;
    const isDetectMale = document.getElementById('male').checked;
    const isDetectFemale = document.getElementById('female').checked;
    const isDetectAds = false; // document.getElementById('ads').checked; // Hidden: Ads blocker removed
    const isDetectImage = document.getElementById('image').checked;
    const isDetectVideo = document.getElementById('video').checked;

    const isObjectCoverBlur = document.getElementById('object-cover-blur').checked;
    const isObjectCoverColor = document.getElementById('object-cover-color').checked;
    const isBgImgColor = document.getElementById('full-img-color').checked;
    const isFullImgBlur = false;//document.getElementById('full-img-blur').checked;
    const accuracyScore = document.getElementById('accuracy-slider').value;
    const colorPickerValue = document.getElementById('color-picker').value;
    const isRoundBox = document.getElementById('roundbox').checked;


    const isObjectCoverBlurVideo = document.getElementById('object-cover-blur-video').checked;
    const isObjectCoverColorVideo = document.getElementById('object-cover-color-video').checked;
    const isObjectCoverBgVideo = document.getElementById('img-bg-color-video').checked;
    const accuracyScoreVideo = document.getElementById('accuracy-slider-video').value;
    const colorPickerValueVideo = document.getElementById('color-picker-video').value;
    const isRoundBoxVideo = document.getElementById('roundbox-video').checked;

    const isInitiallyImgBlur = document.getElementById('initially-img-blur').checked;
    const isBlockAllImage = document.getElementById('block-all-image').checked;











    const targetClasses = [];
    if (isDetectMale) targetClasses.push(0);//body,face,Head classes will be always default 
    if (isDetectFemale) targetClasses.push(1);//body,face,head classes will be always default 
    const accuracyScoreNumber = parseInt(accuracyScore)
    const accuracyScoreNumberVideo = parseInt(accuracyScoreVideo)

    const whitelist = loadedSettings.whitelist || [];
    const isWhitelisted = document.getElementById('whitelist').checked ? false : true;
    const hostname = document.getElementById('hostname').textContent.trim();
    if (isWhitelisted && !whitelist.includes(hostname)) {
        whitelist.push(hostname);
    }
    else if (!isWhitelisted && whitelist.includes(hostname)) {
        const index = whitelist.indexOf(hostname);
        whitelist.splice(index, 1);
    }

    const pordaSettings = {
        pordaAppStatus: pordaAppStatus,
        isDetectMale: isDetectMale,
        isDetectFemale: isDetectFemale,
        isDetectAds: isDetectAds,
        isDetectImage: isDetectImage,
        isDetectVideo: isDetectVideo,


        isObjectCoverBlur: isObjectCoverBlur,
        isObjectCoverColor: isObjectCoverColor,
        isBgImgColor: isBgImgColor,
        isFullImgBlur: isFullImgBlur,
        accuracyScore: accuracyScore,
        accuracyScoreNumber: accuracyScoreNumber,
        colorPickerValue: colorPickerValue,
        isRoundBox: isRoundBox,

        isObjectCoverBlurVideo: isObjectCoverBlurVideo,
        isObjectCoverColorVideo: isObjectCoverColorVideo,
        isObjectCoverBgVideo: isObjectCoverBgVideo,
        colorPickerValueVideo: colorPickerValueVideo,
        accuracyScoreVideo: accuracyScoreVideo,
        accuracyScoreNumberVideo: accuracyScoreNumberVideo,
        isRoundBoxVideo: isRoundBoxVideo,

        isInitiallyImgBlur:isInitiallyImgBlur,
        isBlockAllImage:isBlockAllImage,


        targetClasses: targetClasses,
        whitelist: whitelist
    };
    //chrome.storage.local
    chrome.storage.sync.set({ pordaSettings: pordaSettings }, () => {
        console.log('Project settings saved');

        // Send message to offscreen with updated settings
        chrome.runtime.sendMessage({ type: "updateSettings", updatedSettings: pordaSettings })
            .then(response => {
                console.log('Message sent to offscreen', response);
            })
            .catch(error => {
                console.error('Error sending message to offscreen', error);
            });

    });
}

function loadCheckboxStates() {
    chrome.storage.sync.get(['pordaSettings'], (result) => {
        loadedSettings = result.pordaSettings || getDefaultSettings();

        document.getElementById('porda-status').checked = loadedSettings.pordaAppStatus;
        document.getElementById('male').checked = loadedSettings.isDetectMale;
        document.getElementById('female').checked = loadedSettings.isDetectFemale;
        // document.getElementById('ads').checked = loadedSettings.isDetectAds; // Hidden: Ads blocker removed
        document.getElementById('image').checked = loadedSettings.isDetectImage;
        document.getElementById('video').checked = loadedSettings.isDetectVideo;
        document.getElementById('object-cover-blur').checked = loadedSettings.isObjectCoverBlur;
        document.getElementById('object-cover-color').checked = loadedSettings.isObjectCoverColor;
        document.getElementById('roundbox').checked = loadedSettings.isRoundBox;
        //document.getElementById('full-img-blur').checked = loadedSettings.isFullImgBlur;
        document.getElementById('full-img-color').checked = loadedSettings.isBgImgColor;
        document.getElementById('accuracy-slider').value = loadedSettings.accuracyScoreNumber;
        document.getElementById('accuracy-value').textContent = loadedSettings.accuracyScore;
        document.getElementById('color-picker').value = loadedSettings.colorPickerValue;
        document.getElementById('object-cover-blur').checked = loadedSettings.isObjectCoverBlur;

        document.getElementById('object-cover-blur-video').checked = loadedSettings.isObjectCoverBlurVideo;
        document.getElementById('object-cover-color-video').checked = loadedSettings.isObjectCoverColorVideo;
        document.getElementById('img-bg-color-video').checked = loadedSettings.isObjectCoverBgVideo;
        document.getElementById('roundbox-video').checked = loadedSettings.isRoundBoxVideo;
        document.getElementById('accuracy-slider-video').value = loadedSettings.accuracyScoreNumberVideo;
        document.getElementById('accuracy-value-video').textContent = loadedSettings.accuracyScoreVideo;
        document.getElementById('color-picker-video').value = loadedSettings.colorPickerValueVideo;
        
        document.getElementById('initially-img-blur').checked = loadedSettings.isInitiallyImgBlur;
        document.getElementById('block-all-image').checked = loadedSettings.isBlockAllImage;





        // Get the current hostname and load whitelist status
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            const hostname = new URL(currentTab.url).hostname;
            const host = document.getElementById('hostname');
            host.textContent = hostname;


            const whitelist = loadedSettings.whitelist || [];
            const isWhitelisted = whitelist.includes(hostname);
            document.getElementById('whitelist').checked = isWhitelisted ? false : true;
        });
    });
}

function getDefaultSettings() {
    const defaultSettings = {
        pordaAppStatus: true,
        isDetectMale: false,
        isDetectFemale: true,
        isDetectAds: false,
        isDetectImage: true,
        isDetectVideo: true,

        isObjectCoverBlur: true,
        isObjectCoverColor: false,
        colorPickerValue: '#B4B4B4',
        isRoundBox: true,
        isBgImgColor: false,
        isFullImgBlur: false,
        accuracyScore: "40",
        accuracyScoreNumber: 40,

        isObjectCoverBlurVideo: true,
        isObjectCoverColorVideo: false,
        isObjectCoverBgVideo: false,
        colorPickerValueVideo: '#B4B4B4',
        isRoundBoxVideo: true,
        accuracyScoreVideo: "55",
        accuracyScoreNumberVideo: 55,


        isInitiallyImgBlur: true,
        isBlockAllImage:false,


        targetClasses: [1],
        whitelist: []

    }
    return defaultSettings;

}