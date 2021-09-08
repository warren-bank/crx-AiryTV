### [AiryTV](https://github.com/warren-bank/crx-AiryTV/tree/webmonkey-userscript/es5)

[Userscript](https://github.com/warren-bank/crx-AiryTV/raw/webmonkey-userscript/es5/webmonkey-userscript/AiryTV.user.js) to run in both:
* the [WebMonkey](https://github.com/warren-bank/Android-WebMonkey) application for Android
* the [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) web browser extension for Chrome/Chromium

Its purpose is to:
* provide a simplified interface to access video content hosted by [AiryTV](https://webapp.airy.tv/Live_Streams/) that works in all web browsers
  - special attention is given to Android 4.x WebView, which is based on Chrome v30, to ensure support for older Android devices
* enable watching video content in an external player

#### Notes:

* all URLs for the [airy.tv](https://airy.tv/) domain are redirected to a single [target page](https://airy.tv/privacy-policy/)
  - chosen because its original content contains a minimal amount of script and style
* after the target page has been loaded
  - its original content is replaced by a new single-page app (SPA) that only requires ES5

#### Video Content Protections:

* access to the data API endoint and video hosts does _not_ depend upon any of the following:
  - geographic location of client IP address
  - HTTP request headers
    * such as:
      - _Cookie_ that may contain a website login session ID
      - _Referer_ that may indicate the website from which the request was made
* as such, video content (on-demand mp4 files, and live HLS streams) will play directly on Chromecast

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)
