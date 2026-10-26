# BT3-WEB-DEMO: Git-as-a-DB + PlayHTML Realtime Engine

> 🌐 **Live Demo (GitHub Pages):** [https://thing-or-think.github.io/BT3-WEB-DEMO/](https://thing-or-think.github.io/BT3-WEB-DEMO/)

Dự án kết hợp kiến trúc **"Git chính là Database"** với thư viện cộng tác **PlayHTML (`playhtml.fun`)**, chạy hoàn toàn 100% trên nền tảng web tĩnh **GitHub Pages** (Zero-Backend).

---

## 🌟 Bộ Ba Tính Năng Cốt Lõi

### 1. 💾 Lưu trữ trên GitHub Gist (Git as a DB)
- Mỗi bài code/snippet được lưu trực tiếp thành một GitHub Gist trên tài khoản của người dùng qua GitHub REST API.
- Có sẵn lịch sử commit (Git Version History). Người dùng sở hữu 100% dữ liệu của mình.

### 2. 🍪 Ghi nhớ phiên làm việc bằng Cookie (30 Ngày)
- Khi nhập GitHub Token (quyền `gist`), token được lưu an toàn vào Cookie trình duyệt với thời hạn 30 ngày (`max-age=2592000`).
- Lần sau mở lại web hoặc F5: Tự động đăng nhập thẳng vào trang cá nhân trong 0.2 giây mà không bao giờ phải đăng nhập lại.

### 3. 🎨 Bảng Tương Tác Thời Gian Thực với PlayHTML (`playhtml.fun`)
- Tích hợp thư viện **PlayHTML** cho phép tạo bảng kéo thả thẻ code cộng đồng:
  - `can-move`: Kéo thả các thẻ code tự do, tọa độ đồng bộ trực tiếp tới mọi người đang duyệt web.
  - `can-toggle`: Nút thả tim ❤️ / đánh giá bài viết.
  - `can-duplicate`: Nhân bản các mẩu giấy ghi chú (Sticky Notes) trên bảng.
  - Nút **"Lưu & Ghim lên Bảng PlayHTML"**: Vừa lưu vào Gist, vừa tạo thẻ realtime cho bạn bè cùng lớp thấy ngay lập tức.

### 4. 🔍 Xem & Fork Code của người khác (Kể cả khi họ Offline)
- Người dùng khác dù tắt máy, đi ngủ hay offline thì code vẫn nằm vĩnh viễn trên máy chủ của GitHub.
- Bạn có thể gõ `@username` bất kỳ (VD: `@thing-or-think`, `@torvalds`) để tải toàn bộ Gist của họ.
- Bấm **"🍴 Fork"** để sao chép trực tiếp đoạn code đó về tài khoản cá nhân của bạn chỉ với 1 click.

---

## 🚀 Khởi chạy cục bộ (Tùy chọn)

```bash
npm install
npm start
```
Truy cập: `http://localhost:3000`
