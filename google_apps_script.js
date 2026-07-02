/**
 * GOOGLE APPS SCRIPT BACKEND FOR CONTRACT MANAGEMENT APPLICATION
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Trang tính (Google Sheets) của bạn.
 * 2. Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết mã hiện tại trong tệp Code.gs và dán toàn bộ mã này vào.
 * 4. Nhấn Save (biểu tượng lưu).
 * 5. Nhấn Deploy (Triển khai) -> New deployment (Triển khai mới).
 * 6. Chọn loại triển khai là "Web app" (Ứng dụng web).
 * 7. Cấu hình:
 *    - Description: "Contract Management API"
 *    - Execute as: "Me" (Tôi - tài khoản Google của bạn)
 *    - Who has access: "Anyone" (Bất kỳ ai - để Web app nhận yêu cầu từ ứng dụng của bạn)
 * 8. Nhấn Deploy. Google sẽ yêu cầu cấp quyền truy cập Drive và Sheet, hãy chọn tài khoản của bạn, nhấn "Advanced" -> "Go to ... (unsafe)" và chấp nhận.
 * 9. Copy URL Web App được cấp (có dạng https://script.google.com/macros/s/.../exec) và dán vào tab Cấu hình của Ứng dụng Web.
 */

// Định nghĩa tên Sheet
var SHEET_NAME = "DanhSachHopDong";
var ROOT_FOLDER_NAME = "Hồ Sơ Hợp Đồng - Quản Lý";

// Hàm phục vụ yêu cầu GET: Trả về danh sách hợp đồng hiện có trong Sheet
function doGet(e) {
  var output = ContentService.createTextOutput();
  try {
    var sheet = getOrCreateSheet();
    var data = sheet.getDataRange().getValues();
    var contracts = [];
    
    if (data.length > 1) {
      var headers = data[0];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var contract = {};
        for (var j = 0; j < headers.length; j++) {
          var headerKey = getHeaderKey(headers[j]);
          contract[headerKey] = row[j];
        }
        contracts.push(contract);
      }
    }
    
    var response = {
      status: "success",
      data: contracts
    };
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm phục vụ yêu cầu POST: Tiếp nhận thêm mới hợp đồng và file đính kèm
function doPost(e) {
  try {
    var requestData;
    
    // Đọc dữ liệu từ body của POST request
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      throw new Error("Không tìm thấy dữ liệu yêu cầu.");
    }
    
    var action = requestData.action;
    
    if (action === "addContract") {
      return addContractToSheetAndDrive(requestData);
    } else {
      throw new Error("Hành động không hợp lệ: " + action);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Thêm hợp đồng vào Trang tính và lưu file lên Drive theo năm
function addContractToSheetAndDrive(data) {
  var sheet = getOrCreateSheet();
  
  var contractId = data.contractId || "";
  var title = data.title || "";
  var partner = data.partner || "";
  var value = data.value || 0;
  var signDate = data.signDate || "";
  var expiryDate = data.expiryDate || "";
  var year = data.year || new Date().getFullYear().toString();
  var fileBase64 = data.fileBase64 || null;
  var fileName = data.fileName || "";
  var fileMime = data.fileMime || "";
  
  var fileUrl = "";
  var fileId = "";
  
  // Xử lý lưu file lên Google Drive nếu có file đính kèm
  if (fileBase64 && fileName) {
    try {
      // Tìm hoặc tạo thư mục gốc
      var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
      
      // Tìm hoặc tạo thư mục con theo năm (2024, 2025, 2026...)
      var yearFolder = getOrCreateFolder(rootFolder, year.toString());
      
      // Định dạng tên file: [Mã hợp đồng] - [Đối tác] - [Tên gốc]
      var formattedFileName = "[" + contractId + "] - " + partner + " - " + fileName;
      
      // Giải mã base64 và lưu file
      var byteCharacters = Utilities.base64Decode(fileBase64);
      var blob = Utilities.newBlob(byteCharacters, fileMime, formattedFileName);
      var file = yearFolder.createFile(blob);
      
      // Cấp quyền xem cho bất kỳ ai có link (thuận tiện cho việc click xem từ web app)
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      fileUrl = file.getUrl();
      fileId = file.getId();
    } catch (uploadError) {
      Logger.log("Lỗi tải file lên Drive: " + uploadError.toString());
      // Vẫn tiếp tục lưu dữ liệu text vào Sheet kể cả khi lỗi tải file
      fileUrl = "Lỗi lưu file: " + uploadError.toString();
    }
  }
  
  // Ghi dòng mới vào Google Sheet
  // Cột: ["Mã Hợp Đồng", "Tên Hợp Đồng", "Đối Tác", "Giá Trị (VND)", "Ngày Ký", "Ngày Hết Hạn", "Năm Phân Loại", "Link Tệp Drive", "ID File Drive", "Ngày Đồng Bộ"]
  var syncDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  // Kiểm tra xem mã hợp đồng đã tồn tại trong Sheet chưa để tránh trùng lặp
  var sheetData = sheet.getDataRange().getValues();
  var existingRowIndex = -1;
  for (var i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === contractId && contractId !== "") {
      existingRowIndex = i + 1; // 1-indexed cho row của Sheet
      break;
    }
  }
  
  var rowData = [
    contractId,
    title,
    partner,
    value,
    signDate,
    expiryDate,
    year,
    fileUrl,
    fileId,
    syncDate
  ];
  
  if (existingRowIndex > -1) {
    // Cập nhật dòng cũ nếu trùng Mã hợp đồng
    sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Thêm dòng mới
    sheet.appendRow(rowData);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: existingRowIndex > -1 ? "Đã cập nhật hợp đồng thành công" : "Đã thêm mới hợp đồng thành công",
    fileUrl: fileUrl,
    year: year
  })).setMimeType(ContentService.MimeType.JSON);
}

// Tìm hoặc tạo Sheet
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Tạo tiêu đề cột
    var headers = [
      "Mã Hợp Đồng", 
      "Tên Hợp Đồng", 
      "Đối Tác", 
      "Giá Trị (VND)", 
      "Ngày Ký", 
      "Ngày Hết Hạn", 
      "Năm Phân Loại", 
      "Link Tệp Drive", 
      "ID File Drive",
      "Ngày Đồng Bộ"
    ];
    sheet.appendRow(headers);
    // Định dạng dòng đầu (bold, background color nhẹ)
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#e0f2f1")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Tìm hoặc tạo Folder trong Drive
function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

// Chuyển đổi tên tiếng Việt tiêu đề cột sang key tiếng Anh dạng CamelCase cho API
function getHeaderKey(headerName) {
  switch (headerName) {
    case "Mã Hợp Đồng": return "contractId";
    case "Tên Hợp Đồng": return "title";
    case "Đối Tác": return "partner";
    case "Giá Trị (VND)": return "value";
    case "Ngày Ký": return "signDate";
    case "Ngày Hết Hạn": return "expiryDate";
    case "Năm Phân Loại": return "year";
    case "Link Tệp Drive": return "fileUrl";
    case "ID File Drive": return "fileId";
    case "Ngày Đồng Bộ": return "syncDate";
    default: return headerName.replace(/\s+/g, '');
  }
}
