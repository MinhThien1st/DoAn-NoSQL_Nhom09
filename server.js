/**
 * HỆ THỐNG QUẢN LÝ LỘ TRÌNH VÀ TÌM ĐƯỜNG XE BUÝT CÔNG CỘNG
 * Framework cơ bản khởi tạo Server và kết nối Neo4j
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const neo4j = require('neo4j-driver');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình Driver kết nối Neo4j
const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || '12345678'
  )
);

// Kiểm tra kết nối Neo4j
driver.verifyConnectivity()
  .then(() => console.log('✅ Đã kết nối cơ sở dữ liệu Neo4j thành công!'))
  .catch(err => console.warn('⚠️ Cảnh báo kết nối Neo4j:', err.message));

// Health check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Bus Routing System Backend is running' });
});

// ==========================================
// [SV1]: CÁC API CRUD TRẠM VÀ TUYẾN SẼ ĐƯỢC THÊM TẠI ĐÂY
// ==========================================

// ==========================================
// [SV2]: THUẬT TOÁN TÌM ĐƯỜNG VÀ API TÌM KIẾM SẼ ĐƯỢC THÊM TẠI ĐÂY
// ==========================================

// ==========================================
// [SV3]: TÍCH HỢP OSRM ROAD ROUTING VÀ PHỤC VỤ CLIENT
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Server đang khởi chạy tại http://localhost:${PORT}`);
});
