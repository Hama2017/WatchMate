function getNetflixId() {
    const url = window.location.href;
    const match = url.match(/watch\/(\d+)/);
    return match ? match[1] : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getNetflixId") {
        sendResponse({ id: getNetflixId() });
    }
});
