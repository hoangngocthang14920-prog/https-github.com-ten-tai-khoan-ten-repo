# HƯỚNG DẪN CẤU HÌNH & SỬ DỤNG ỨNG DỤNG QUẢN LÝ HỢP ĐỒNG THÔNG MINH AI

Ứng dụng này sử dụng Trí tuệ nhân tạo (Gemini AI) để tự động đọc tài liệu quét (scan), phân loại tệp tin vào các thư mục theo năm (2024, 2025, 2026) trên Google Drive và đồng bộ toàn bộ siêu dữ liệu (metadata) trực tiếp vào bảng Google Trang tính (Google Sheets).

---

## 📂 Các Tệp Tin Trong Dự Án

1. **`index.html`**: Giao diện chính của ứng dụng (Tổng quan, Quét AI, Lưu trữ theo Năm, Bảng Dữ liệu, Cấu hình).
2. **`styles.css`**: Giao diện thiết kế Premium Dark Theme hiện đại, responsive đầy đủ.
3. **`app.js`**: Logic vận hành, xử lý gọi Gemini API, quản lý dữ liệu cục bộ và đồng bộ Google Sheets Web App.
4. **`google_apps_script.js`**: Mã nguồn chạy trên Google Apps Script để ghi dữ liệu vào Sheet và lưu file vào Google Drive.

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh (Chạy Cục Bộ)

Bạn chỉ cần kích đúp chuột vào tệp **`index.html`** để chạy trực tiếp ứng dụng trên trình duyệt web của mình.
*Mặc định hệ thống chạy ở chế độ **Giả lập AI (Mock)** cho phép bạn kéo thả file và kiểm thử đầy đủ giao diện, tính năng mà không cần cài đặt API Key ngay.*

---

## 🛠️ Hướng Dẫn Liên Kết Hệ Thống (3 Phút Thiết Lập)

Để hệ thống hoạt động thực tế với Google Drive, Google Sheets và AI của bạn, hãy làm theo hai bước cấu hình sau:

### BƯỚC 1: Cấu Hình Lưu Trữ (Google Sheets & Google Drive)

1. Mở một **Google Trang tính (Google Sheets)** mới hoặc có sẵn của bạn.
2. Trên thanh menu, chọn **Tiện ích mở rộng (Extensions)** -> **Apps Script**.
3. Xóa toàn bộ mã mặc định trong tệp `Code.gs`.
4. Mở tệp **`google_apps_script.js`** trong dự án này, copy toàn bộ nội dung và dán vào cửa sổ Apps Script. Nhấn nút **Lưu (Save - biểu tượng đĩa mềm)**.
5. Ở góc trên bên phải, nhấn nút **Triển khai (Deploy)** -> **Triển khai mới (New deployment)**.
6. Chọn loại cấu hình là **Ứng dụng web (Web app)** bằng cách nhấn vào bánh răng cài đặt.
7. Thiết lập cấu hình triển khai:
   - **Mô tả**: `Contract Management API`
   - **Thực thi dưới dạng (Execute as)**: `Tôi (Tài khoản Google của bạn)`
   - **Ai có quyền truy cập (Who has access)**: `Bất kỳ ai (Anyone)` *(Rất quan trọng để ứng dụng Web Client có thể gửi dữ liệu lên)*.
8. Nhấn **Triển khai (Deploy)**.
9. Google sẽ yêu cầu cấp quyền truy cập tài khoản, nhấn chọn tài khoản của bạn -> chọn **Advanced (Nâng cao)** -> click vào đường link **"Go to ... (unsafe)"** ở phía dưới cùng -> nhấn **Allow (Cho phép)**.
10. Hệ thống sẽ cấp cho bạn một **URL Ứng dụng web** (có đuôi `/exec`). Hãy **Copy URL này**.
11. Mở ứng dụng web của bạn, vào tab **Cấu hình Hệ thống**, dán URL này vào ô **Google Apps Script Web App URL** và nhấn **Lưu Cấu Hình Kết Nối**.

*Sau khi cấu hình, trên Google Drive của bạn sẽ tự động xuất hiện thư mục gốc tên là `Hồ Sơ Hợp Đồng - Quản Lý` và các thư mục con phân loại theo năm: `2024`, `2025`, `2026` khi có file đầu tiên được tải lên.*

---

### BƯỚC 2: Cấu Hình Nhận Diện AI (Gemini API Key)

Để AI có thể tự động đọc và trích xuất dữ liệu từ tệp scan của bạn:

1. Truy cập vào trang web [Google AI Studio](https://aistudio.google.com/).
2. Đăng nhập bằng tài khoản Google của bạn.
3. Nhấp vào nút **"Get API key"** (ở thanh menu bên trái).
4. Nhấp chọn **"Create API key"** (Tạo API key mới), chọn hoặc tạo dự án Google Cloud tương ứng và sao chép mã Key được cấp.
5. Quay lại ứng dụng web của bạn, mở tab **Cấu hình Hệ thống**, dán mã Key này vào ô **Gemini API Key** và nhấn **Lưu Cấu Hình AI**.

---

## 🎯 Kiểm Tra Đồng Bộ

1. Sau khi hoàn tất 2 bước cấu hình trên, góc dưới bên trái của ứng dụng sẽ hiển thị các trạng thái báo hiệu màu xanh lá cây: `Google Sheet: Sẵn sàng` và `Gemini AI: Kết nối live`.
2. Chuyển qua tab **Bảng Dữ liệu**, nhấn nút **Đồng bộ ngay** để đồng bộ và hiển thị các hợp đồng đã có trên Google Sheet về giao diện Web của bạn.
3. Chuyển qua tab **Tải lên & Quét AI**, kéo thả thử một tệp tin hợp đồng scan dạng ảnh hoặc PDF để trải nghiệm AI tự động điền form và lưu trữ phân loại năm!
