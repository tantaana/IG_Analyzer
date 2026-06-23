# Instagram Analyzer — Android APK

Your Tampermonkey script (v31.0) wrapped as a native Android app.
The app is a full-screen WebView that loads `instagram.com` and auto-injects
the analyzer script on every page load — identical behavior to the browser extension.

---

## How it works

```
┌─────────────────────────────────────────────┐
│  Android App (IGAnalyzer)                   │
│  ┌────────────────────────────────────────┐ │
│  │  WebView — loads instagram.com         │ │
│  │  (desktop Chrome UA, cookies enabled)  │ │
│  │                                        │ │
│  │  onPageFinished() fires →              │ │
│  │    evaluateJavascript(igscript.js)     │ │
│  │      → Analyzer panel appears on top  │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- `credentials: "include"` works because the WebView keeps real Instagram cookies
- `evaluateJavascript()` bypasses CSP (runs at native layer, not as inline script)
- `intent://` deep links are blocked so Instagram can't redirect to the native app
- Hardware back button navigates WebView history

---

## Build instructions

### Requirements
- **Android Studio** Hedgehog (2023.1.1) or newer — [download](https://developer.android.com/studio)
- **JDK 17** (bundled with Android Studio — no separate install needed)
- **Android SDK** API 34 (Android Studio installs this on first sync)

### Steps

1. Extract this zip / open the `IGAnalyzer` folder in Android Studio
   `File → Open → select the IGAnalyzer folder → OK`

2. Wait for Gradle sync to finish (first sync downloads ~500 MB of dependencies)

3. Build a debug APK:
   `Build → Build Bundle(s) / APK(s) → Build APK(s)`

4. The APK is at:
   `app/build/outputs/apk/debug/app-debug.apk`

5. Transfer the APK to your phone and install it
   (Enable "Install unknown apps" in Android settings first)

---

## Usage

1. Open **IG Analyzer** on your phone
2. Log in to Instagram if prompted (cookies persist between sessions)
3. The analyzer panel appears — enter a username and tap **Analyze Account**
4. Results show in three tabs: 👻 Don't Follow Me · 🔕 I Don't Follow · 🤝 Mutuals

---

## Notes

- **Desktop UA**: The app uses a desktop Chrome User-Agent so Instagram serves the
  full web version (the same version the script was written for). Pinch to zoom works.
- **Staying logged in**: Cookies are saved permanently — you only log in once.
- **API rate limits**: Instagram limits requests. If you get blocked, wait 15–30 min.
- **Private accounts**: The API only returns followers/following for accounts you
  can access (your own, or public accounts).
- **Icon**: Gradient bar-chart icon. Replace `ic_launcher_foreground.xml` to customise.

---

## Project structure

```
IGAnalyzer/
├── app/src/main/
│   ├── assets/igscript.js          ← The analyzer (JS stripped of TM headers)
│   ├── java/com/iganalyzer/
│   │   └── MainActivity.kt         ← WebView setup + JS injection
│   ├── res/
│   │   ├── layout/activity_main.xml
│   │   ├── drawable/               ← Adaptive icon vector files
│   │   ├── mipmap-*/               ← PNG icons for all screen densities
│   │   └── values/                 ← strings.xml, themes.xml
│   └── AndroidManifest.xml
├── app/build.gradle                ← AGP 8.3.1, minSdk 23, targetSdk 34
├── build.gradle                    ← Plugin declarations
├── settings.gradle
└── gradle.properties
```
