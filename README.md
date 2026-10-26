# BT3-WEB-DEMO: Git-as-a-DB + PlayHTML Auto-Directory & Gist Aggregator

> 🌐 **Live Demo (GitHub Pages):** [https://thing-or-think.github.io/BT3-WEB-DEMO/](https://thing-or-think.github.io/BT3-WEB-DEMO/)

Dự án kết hợp kiến trúc **"Git chính là Database"** với thư viện **PlayHTML (`playhtml.fun`)**, chạy hoàn toàn 100% trên nền tảng web tĩnh **GitHub Pages** (Zero-Backend).

---

## 🌟 Tính năng nổi bật

### 1. 👥 Tự động ghi danh thành viên vào PlayHTML Realtime
- Bất kỳ ai vào web sau khi đăng nhập (hoặc tự động nhận diện từ Cookie 30 ngày), **username của họ sẽ được tự động lưu vào kênh dữ liệu PlayHTML (`createPageData`)**.
- Danh bạ thành viên này tồn tại vĩnh viễn và đồng bộ ngay lập tức cho tất cả mọi người đang mở web.

### 2. 🌐 Tự động tổng hợp Gist của TOÀN BỘ thành viên lên Feed Cộng Đồng
- Danh sách Feed tự động truy vấn GitHub API để lấy các bài tập/code Gist mới nhất của **tất cả các thành viên trong danh bạ PlayHTML**.
- **User Offline vẫn xem bình thường:** Dù bạn bè đã tắt máy đi ngủ, Gist của họ vẫn xuất hiện trên Feed để mọi người cùng xem, sao chép hoặc Fork về tài khoản cá nhân.
- Hỗ trợ bộ lọc nhanh bằng các thẻ **Member Chips**: Bấm vào `@username` của bất kỳ ai để lọc riêng các bài viết của người đó.

### 3. 🍪 Ghi nhớ phiên làm việc bằng Cookie (30 Ngày)
- Token được lưu an toàn vào Cookie trình duyệt với thời hạn 30 ngày (`max-age=2592000`).
- Lần sau mở lại web hoặc F5: Tự động đăng nhập thẳng vào trang cá nhân trong 0.2 giây mà không cần nhập lại token.

### 4. ❤️ Tương tác thời gian thực với PlayHTML
- Các nút phản ứng (❤️ Thích, ⭐ Hữu ích...) sử dụng thuộc tính `can-toggle` của PlayHTML để đồng bộ trạng thái bấm like tức thời giữa các phiên duyệt web.

### 5. ⚔️ Đấu Trường AI OTTv2 9x9 (Cambridge Battlecode & Tháp Leo Rank Offline)
- **Bàn cờ 9×9 chiến thuật:** 2 phe Đỏ (Căn cứ `a1`) và Xanh (Căn cứ `i9`), mỗi bên 9 quân (3 ✊ Đấm, 3 🖐️ Lá, 3 ✌️ Kéo). Di chuyển 8 hướng, quy tắc khắc chế Oẳn Tù Tì.
- **Quy chế Leo Thang Bậc (Gauntlet):** Người chơi thách đấu các đối thủ/bot theo thứ tự từ **Rank thấp nhất lên Rank cao nhất**:
  - **Thắng:** Tiếp tục leo lên đối thủ ở thứ hạng cao hơn.
  - **Thua:** Dừng lại ngay lập tức tại vị trí thua cuộc, hệ thống tự động **chèn thứ hạng mới của người chơi vào vị trí ngay sau đối thủ vừa thua** (hoặc vinh danh Tân Vô Địch Rank 1 nếu thắng toàn bộ).
- **Zero-Backend Sandbox:** Mô phỏng trận đấu 100% client-side, hỗ trợ cả tự đánh lẫn bot tự hành tốc độ cao (0.15s - 0.8s hoặc Instant Skip).

---

## 🚀 Khởi chạy cục bộ (Tùy chọn)

```bash
npm install
npm start
```
Truy cập: `http://localhost:3000`
