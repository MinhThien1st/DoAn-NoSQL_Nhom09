# ĐỀ TÀI 12: HỆ THỐNG QUẢN LÝ LỘ TRÌNH VÀ TÌM ĐƯỜNG XE BUÝT CÔNG CỘNG (NEO4J)

## 📌 1. Giới thiệu Đề tài
Dự án ứng dụng Cơ sở dữ liệu Đồ thị (**Neo4j - Graph Database**) để mô hình hóa mạng lưới giao thông công cộng xe buýt tại TP. Hồ Chí Minh. Hệ thống hỗ trợ tra cứu lộ trình tối ưu (nhanh nhất, ít đổi tuyến nhất, ngắn nhất) và cung cấp giao diện quản trị điều phối trạm/tuyến xe buýt trực quan.

## 👥 2. Phân công Nhiệm vụ Thành viên
| STT | Thành viên | Vai trò | Trọng tâm công việc |
| :--- | :--- | :--- | :--- |
| 1 | **Thành viên 1** | **Data Architect & CRUD Lead** | - Thiết kế mô hình CSDL Graph Neo4j (`:Station`, `:BusRoute`, `[:CONNECTS_TO]`).<br>- Viết câu lệnh Cypher khởi tạo dữ liệu và REST API CRUD Trạm/Tuyến xe.<br>- Xây dựng giao diện Quản trị Admin. |
| 2 | **Thành viên 2** | **Advanced Query Specialist** | - Cài đặt thuật toán Dijkstra tìm đường đi ngắn nhất đa tiêu chí (Thời gian, Đổi xe, Khoảng cách).<br>- Xử lý chi phí chuyển tuyến (Transfer Penalty +8 phút).<br>- Tích hợp tính năng giải trình câu lệnh Cypher tương đương trên Web. |
| 3 | **Thành viên 3** | **Fullstack Integrator & UI Specialist** | - Tích hợp toàn diện Backend và Frontend.<br>- Xây dựng bản đồ Leaflet số, định tuyến đường thực OSRM 100%.<br>- Phát triển mô phỏng di chuyển xe buýt thời gian thực (radar sonar, dừng đón trả khách). |

## 🚀 3. Hướng dẫn Cài đặt & Khởi chạy

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Cấu hình môi trường
Tạo file `.env` ở thư mục gốc:
```env
PORT=3000
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=mật_khẩu_neo4j_của_bạn
```

### Bước 3: Nạp dữ liệu vào Neo4j
Mở Neo4j Browser hoặc Workspace, chạy toàn bộ nội dung file:
`database/init_data.cypher`

### Bước 4: Khởi chạy Server
```bash
npm start
```
Mở trình duyệt truy cập: `http://localhost:3000`
