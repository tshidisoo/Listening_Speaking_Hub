# Bilge's English Hub — Setup Guide

A mobile-first speaking & listening practice site for Bilge (A1 English learner).
Hosted on GitHub Pages. Audio recordings go directly to your Google Drive.

---

## File Overview

| File | Purpose |
|------|---------|
| `index.html` | The site — all 5 day cards |
| `style.css` | Soft pastel styles, mobile-first |
| `script.js` | Recording logic + Drive upload |
| `apps-script.gs` | Paste this into Google Apps Script (the backend) |

---

## Step 1 — Create a Google Drive folder

1. Open [Google Drive](https://drive.google.com)
2. Create a new folder, e.g. **"Bilge Voice Notes"**
3. Open the folder and look at the URL in your browser:
   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                          ↑ THIS is your Folder ID
   ```
4. Copy the Folder ID — you'll need it in Step 2.

---

## Step 2 — Set up the Google Apps Script backend

1. Go to [https://script.google.com](https://script.google.com)
2. Click **New project**
3. Delete everything in the editor
4. Open the file `apps-script.gs` from this project and **copy all of it**
5. Paste it into the Apps Script editor
6. Find this line near the top and replace the placeholder with your real Folder ID:
   ```javascript
   var FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";
   ```
7. Click **Save** (Ctrl+S / Cmd+S)

### Deploy as a Web App

8. Click **Deploy** (top right) → **New deployment**
9. Click the gear icon ⚙ next to "Select type" → choose **Web app**
10. Fill in the settings:
    - **Description:** Bilge audio receiver
    - **Execute as:** Me *(your Google account)*
    - **Who has access:** Anyone
11. Click **Deploy**
12. Google will ask you to **authorise** the script — click through and allow it
13. Copy the **Web App URL** — it looks like:
    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```

---

## Step 3 — Connect the site to your Apps Script

1. Open `script.js` in a text editor
2. Find this line at the top:
   ```javascript
   const DRIVE_UPLOAD_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. Replace the placeholder with your Web App URL:
   ```javascript
   const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Save the file.

---

## Step 4 — Add your YouTube video links

The site currently uses YouTube **search URLs** as placeholders.
After you find the exact videos you want Bilge to watch, replace them:

1. Open `index.html`
2. Search for `youtube.com/results?search_query=` — you'll find 5 of them
3. Replace each search URL with the real `youtube.com/watch?v=...` URL

For **Thursday (Manifest)**, replace the placeholder with the exact music video URL.

---

## Step 5 — Publish on GitHub Pages

1. Create a GitHub account at [github.com](https://github.com) if you don't have one
2. Click **New repository** — name it e.g. `bilge-english-hub`
3. Make it **Public**
4. Upload all 4 files: `index.html`, `style.css`, `script.js`, `apps-script.gs`
   *(You can drag and drop them into the GitHub web interface)*
5. Go to **Settings** → **Pages**
6. Under **Source**, select **main branch** → **/ (root)** → click **Save**
7. GitHub will give you a URL like:
   ```
   https://yourusername.github.io/bilge-english-hub/
   ```
8. Share this URL with Bilge!

---

## How recordings reach you

When Bilge taps **Submit to Teacher**:

```
Her phone → script.js → your Apps Script Web App → your Google Drive folder
```

Files are named like: `Bilge_Monday_2026-04-14.webm`

You'll find them waiting in your **"Bilge Voice Notes"** Drive folder.

---

## Testing before sending to Bilge

1. Open the site URL on your own phone
2. Tap any day card → tap **Tap to Record**
3. Allow microphone access when prompted
4. Say a few words → tap **Tap to Stop**
5. Listen to the playback
6. Tap **Submit to Teacher**
7. Check your Google Drive folder — the file should appear within a few seconds

### Health check
Visit your Apps Script Web App URL directly in a browser. You should see:
```json
{"status":"ok","message":"Bilge's Hub backend is running!"}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Microphone access denied" | Bilge needs to allow mic in her browser settings |
| Submit button does nothing | Check that `DRIVE_UPLOAD_URL` in `script.js` is set correctly |
| File doesn't appear in Drive | Re-deploy the Apps Script (Step 2) after any changes to the `.gs` file |
| Site looks broken | Make sure all 3 files (`index.html`, `style.css`, `script.js`) are in the same folder |
| iOS Safari won't record | Ensure the site is on **HTTPS** (GitHub Pages always uses HTTPS — ✓) |

---

## Optional: Submission log spreadsheet

In `apps-script.gs`, you can set `SHEET_ID` to a Google Spreadsheet ID.
The script will then log every submission (day, date, filename) as a new row —
useful if you want a quick overview of when Bilge submitted each day.

---

*Made with 💜 for Bilge · Keep practising every day!*
