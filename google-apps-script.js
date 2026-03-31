// ============================================
// SHARDA INTERIOR DAILY EXPENSE
// Google Apps Script (Web App Backend)
// ============================================
//
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1zJfYFOUtcm1lW5xo_eNrAky4SUaq2KdjVxjHqu9Wl9s/edit
// 2. Rename "Sheet1" tab to "Expenses"
// 3. In Row 1, add these headers:
//    A1: Date | B1: Time | C1: Item Name | D1: Amount | E1: Payment Type | F1: Receipt Taken | G1: Receipt Photo
// 4. Go to Extensions → Apps Script
// 5. Paste this entire code into the script editor
// 6. Click Deploy → New Deployment
//    - Type: Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 7. Copy the Web App URL
// 8. Paste it into the APPS_SCRIPT_URL variable in index.html
//

/**
 * doPost(e) — Save a new expense entry
 */
function doPost(e) {
  try {
    const sheetId = "1zJfYFOUtcm1lW5xo_eNrAky4SUaq2KdjVxjHqu9Wl9s";
    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName("Expenses") || ss.getSheetByName("Expences") || ss.getSheets()[0];
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);

    const now = new Date();
    const date = Utilities.formatDate(now, "Asia/Kolkata", "dd/MM/yyyy");
    const time = Utilities.formatDate(now, "Asia/Kolkata", "hh:mm a");

    let photoCell = "No Receipt";
    const photoData = data.receiptPhoto;

    if (photoData && photoData !== "No" && photoData !== "No Receipt" && photoData.startsWith("data:image")) {
      try {
        // Extract base64 and mime type
        const mimeType = photoData.substring(photoData.indexOf(":") + 1, photoData.indexOf(";"));
        const base64String = photoData.split(",")[1];
        const byteCharacters = Utilities.base64Decode(base64String);
        
        // Generate a valid filename based on itemName and timestamp
        const ext = mimeType.split("/")[1] || "png";
        const fileName = "Receipt_" + (data.itemName || "Expense").replace(/[^a-z0-9]/gi, '_') + "_" + now.getTime() + "." + ext;
        
        const blob = Utilities.newBlob(byteCharacters, mimeType, fileName);

        // Find or create 'Sharda Interior Receipts' folder
        const folderName = "Sharda Interior Receipts";
        const folders = DriveApp.getFoldersByName(folderName);
        let folder;
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(folderName);
        }

        // Save file & update permissions
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        // Create hyperlink for the sheet cell
        photoCell = '=HYPERLINK("' + file.getUrl() + '", "View Receipt")';
      } catch (err) {
        photoCell = "Error parsing receipt: " + err.message;
      }
    }

    sheet.appendRow([
      date,
      time,
      data.itemName,
      data.amount,
      data.paymentType,
      data.receiptTaken,
      photoCell
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doGet(e) — Fetch today's expenses
 */
function doGet(e) {
  try {
    const sheetId = "1zJfYFOUtcm1lW5xo_eNrAky4SUaq2KdjVxjHqu9Wl9s";
    const ss = SpreadsheetApp.openById(sheetId);
    let sheet = ss.getSheetByName("Expenses") || ss.getSheetByName("Expences") || ss.getSheets()[0];
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const rows = sheet.getDataRange().getValues();

    const today = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy");

    // Skip header row (index 0), filter by today's date
    const todayRows = rows.slice(1).filter(row => {
      // Handle both string dates and Date objects from Google Sheets
      let rowDate = row[0];
      if (rowDate instanceof Date) {
        rowDate = Utilities.formatDate(rowDate, "Asia/Kolkata", "dd/MM/yyyy");
      }
      return rowDate === today;
    });

    const result = todayRows.map(row => ({
      date: row[0] instanceof Date 
        ? Utilities.formatDate(row[0], "Asia/Kolkata", "dd/MM/yyyy") 
        : row[0],
      time: row[1],
      itemName: row[2],
      amount: row[3],
      paymentType: row[4],
      receiptTaken: row[5],
      receiptPhoto: row[6]
    }));

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
