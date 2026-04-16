// =========================================
//  BILGE'S ENGLISH HUB — apps-script.gs
//  Google Apps Script backend
//  Receives audio from the site and saves
//  it to your Google Drive folder.
// =========================================
//
//  SETUP STEPS:
//  1. Go to https://script.google.com
//  2. Create a new project (name it anything)
//  3. Delete the default code and paste THIS file
//  4. Set FOLDER_ID below (see README.md)
//  5. Click Deploy → New deployment
//     - Type: Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  6. Click Deploy → copy the Web App URL
//  7. Paste that URL into script.js as DRIVE_UPLOAD_URL
// =========================================

// ── CONFIGURATION ─────────────────────────────────────────────────
//
//  One folder per student. Find the ID in the Drive folder URL:
//  https://drive.google.com/drive/folders/THIS_IS_THE_ID
//
var BILGE_FOLDER_ID  = "1SwQDApb0ywl40UgAMVcGShVOzWBdAuU2";
var ZEYNEP_FOLDER_ID = "1wScbMlm2spAdmyaKLhoiAWAvJYJsnter";
var ALIYA_FOLDER_ID  = "1KH_f8Vbe38yaS-0fNdql0rf6LMMMRASP";

// ── MAIN HANDLER ──────────────────────────────────────────────────
function doPost(e) {
  try {
    var payload  = JSON.parse(e.postData.contents);
    var filename = payload.filename;   // e.g. "Bilge_Monday_2026-04-14.webm"
    var mimeType = payload.mimeType;   // e.g. "audio/webm"
    var base64   = payload.data;       // base64-encoded audio
    var day      = payload.day;        // e.g. "monday"
    var date     = payload.date;       // e.g. "2026-04-14"
    var student  = payload.student || "Bilge";  // "Bilge" or "Zeynep"

    // Decode base64 → binary blob
    var decoded  = Utilities.base64Decode(base64);
    var blob     = Utilities.newBlob(decoded, mimeType, filename);

    // Route to the correct student folder
    var folderId = (student === "Zeynep") ? ZEYNEP_FOLDER_ID
                 : (student === "Aliya")  ? ALIYA_FOLDER_ID
                 : BILGE_FOLDER_ID;
    var folder   = DriveApp.getFolderById(folderId);
    var file     = folder.createFile(blob);

    // Log the submission for your records
    logSubmission(day, date, filename, file.getId());

    return buildResponse({ success: true, fileId: file.getId() });

  } catch (err) {
    return buildResponse({ success: false, error: err.message }, 500);
  }
}

// ── LOGGING (optional but helpful) ───────────────────────────────
//
//  Writes a row to a "Submissions" sheet in a Google Spreadsheet.
//  Leave SHEET_ID as "" to skip logging.
//
var SHEET_ID = "";  // Optional: paste your Google Sheet ID here

function logSubmission(day, date, filename, fileId) {
  if (!SHEET_ID) return;
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Submissions");
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SHEET_ID).insertSheet("Submissions");
      sheet.appendRow(["Timestamp", "Day", "Date", "Filename", "Drive File ID"]);
    }
    sheet.appendRow([new Date(), day, date, filename, fileId]);
  } catch (err) {
    // Non-critical — don't block the upload if logging fails
    Logger.log("Logging failed: " + err.message);
  }
}

// ── CORS + JSON response helper ───────────────────────────────────
function buildResponse(data, statusCode) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── doGet: simple health check ────────────────────────────────────
//  Visit the Web App URL in a browser to confirm it's deployed.
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok", message: "Bilge's Hub backend is running!" }))
    .setMimeType(ContentService.MimeType.JSON);
}
