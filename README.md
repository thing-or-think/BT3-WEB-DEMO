# BT3-WEB-DEMO: Git-as-a-Database & Auth Demo

> 🌐 **Live Demo (GitHub Pages):** [https://thing-or-think.github.io/BT3-WEB-DEMO/](https://thing-or-think.github.io/BT3-WEB-DEMO/)

Dự án demo kiến trúc **"Git chính là Database"**: Web chạy 100% trên môi trường tĩnh (**GitHub Pages**), không cần bất kỳ máy chủ backend hay database bên ngoài nào.

---

## 🌟 Tính năng chính

1. **Xác thực & Ghi nhớ phiên bằng Cookie (30 Ngày):**
   - Đăng nhập bằng GitHub Token (chỉ cần quyền `gist`).
   - Token được lưu vào Cookie trình duyệt với thời hạn **30 ngày** (`max-age=2592000`).
   - Mỗi lần mở lại web hoặc F5: Trình duyệt tự động nhận diện từ Cookie, **không bao giờ phải đăng nhập lại**.
2. **Git chính là Database:**
   - Người dùng soạn code trực tiếp trên web và bấm "Lưu".
   - Web gọi trực tiếp GitHub Gist API để tạo commit lưu vào GitHub của chính người dùng.
   - 100% dữ liệu thuộc sở hữu của người dùng.
3. **Triển khai tự động bằng GitHub Actions:**
   - Sử dụng GitHub Actions workflow (`.github/workflows/deploy.yml`) tự động deploy lên GitHub Pages mỗi khi push code lên nhánh `main`.

---

## 🚀 Cài đặt & Chạy cục bộ (Tùy chọn)

Nếu muốn chạy dưới dạng Node.js Express server:
```bash
npm install
npm start
```
Truy cập: `http://localhost:3000`
