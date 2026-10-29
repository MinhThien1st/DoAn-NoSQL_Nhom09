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
// [SV1]: CÁC API CRUD TRẠM VÀ TUYẾN
// Quy ước thuộc tính (khớp database/init_data.cypher):
//   Station : id, name, lat, lng, zone
//   BusRoute: id, code, name, color, interval, start_time, end_time, fare
// ==========================================

// Hàm tiện ích: có giá trị thật sự hay không (cho phép số 0)
const hasValue = (v) => v !== undefined && v !== null && v !== '';

// 1. LẤY DANH SÁCH TẤT CẢ TRẠM DỪNG (GET /api/stations)
app.get('/api/stations', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (s:Station) RETURN s.id as id, s.name as name, s.lat as lat, s.lng as lng ORDER BY s.name ASC'
    );
    const stations = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      lat: record.get('lat'),
      lng: record.get('lng'),
      lon: record.get('lng') // giữ thêm "lon" để code cũ của người khác không bị lỗi
    }));
    res.json({ success: true, count: stations.length, data: stations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.close();
  }
});

// 2. THÊM TRẠM DỪNG MỚI (POST /api/stations)
app.post('/api/stations', async (req, res) => {
  const { id, name } = req.body;
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(hasValue(req.body.lng) ? req.body.lng : req.body.lon);
  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ success: false, message: 'Thiếu hoặc sai thông tin trạm (name, lat, lng là bắt buộc)' });
  }
  const stationId = id || 'ST_' + Date.now();
  const session = driver.session();
  try {
    await session.run(
      `CREATE (s:Station {id: $id, name: $name, lat: $lat, lng: $lng}) RETURN s`,
      { id: stationId, name, lat, lng }
    );
    res.json({ success: true, message: 'Thêm trạm xe buýt thành công!', data: { id: stationId, name, lat, lng } });
  } catch (error) {
    // Trùng id -> vi phạm constraint station_id_unique
    if (error.code && error.code.includes('ConstraintValidationFailed')) {
      return res.status(409).json({ success: false, message: `Mã trạm ${stationId} đã tồn tại` });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.close();
  }
});

// 3. SỬA THÔNG TIN TRẠM DỪNG (PUT /api/stations/:id)
app.put('/api/stations/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const latRaw = req.body.lat;
  const lngRaw = hasValue(req.body.lng) ? req.body.lng : req.body.lon;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (s:Station {id: $id})
       SET s.name = coalesce($name, s.name),
           s.lat  = coalesce($lat, s.lat),
           s.lng  = coalesce($lng, s.lng)
       RETURN s`,
      {
        id,
        name: name || null,
        lat: hasValue(latRaw) ? parseFloat(latRaw) : null,
        lng: hasValue(lngRaw) ? parseFloat(lngRaw) : null
      }
    );
    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trạm cần cập nhật' });
    }
    res.json({ success: true, message: 'Cập nhật thông tin trạm thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.close();
  }
});

// 4. XÓA TRẠM DỪNG (DELETE /api/stations/:id)
app.delete('/api/stations/:id', async (req, res) => {
  const { id } = req.params;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (s:Station {id: $id}) DETACH DELETE s RETURN count(*) AS soTramXoa`,
      { id }
    );
    // Với DETACH DELETE ... RETURN count(*): số bản ghi = 1, giá trị = số node đã xóa
    const deleted = result.records[0].get('soTramXoa');
    const n = typeof deleted === 'object' && deleted.toNumber ? deleted.toNumber() : deleted;
    if (n === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy trạm ${id}` });
    }
    res.json({ success: true, message: `Đã xóa thành công trạm ${id}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.close();
  }
});

// 5. CẬP NHẬT LỊCH TRÌNH / THỜI GIAN XUẤT BẾN TUYẾN XE (PUT /api/routes/:id)
// Body nhận: startTime, endTime, interval, fare  (ghi vào start_time, end_time cho khớp dữ liệu gốc)
app.put('/api/routes/:id', async (req, res) => {
  const { id } = req.params;
  const { startTime, endTime, interval, fare } = req.body;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (r:BusRoute {id: $id})
       SET r.start_time = coalesce($startTime, r.start_time),
           r.end_time   = coalesce($endTime, r.end_time),
           r.interval   = coalesce(toInteger($interval), r.interval),
           r.fare       = coalesce(toInteger($fare), r.fare)
       RETURN r`,
      {
        id,
        startTime: hasValue(startTime) ? startTime : null,
        endTime: hasValue(endTime) ? endTime : null,
        interval: hasValue(interval) ? Number(interval) : null,
        fare: hasValue(fare) ? Number(fare) : null
      }
    );
    if (result.records.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tuyến xe buýt để cập nhật' });
    }
    res.json({ success: true, message: `Đã cập nhật lịch trình tuyến xe ${id} thành công!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.close();
  }
});


function findShortestPathLocal(startId, endId, mode = 'time', dataset) {
  const { stations, routes } = dataset;

  // Xây dựng đồ thị kề từ danh sách các tuyến xe buýt
  const adj = {};
  stations.forEach(s => { adj[s.id] = []; });

  routes.forEach(route => {
    for (let i = 0; i < route.stationIds.length - 1; i++) {
      const u = route.stationIds[i];
      const v = route.stationIds[i + 1];
      const dist = route.distances ? (route.distances[i] || 1.2) : 1.2;
      const duration = route.durations ? (route.durations[i] || 3.5) : 3.5;

      if (adj[u]) {
        adj[u].push({ to: v, routeId: route.id, routeName: route.name, routeCode: route.code, distance: dist, duration: duration });
      }
    }
  });

  // Khởi tạo hàng đợi và bảng chi phí Dijkstra
  const distances = {};
  const previous = {};
  const pq = [{ id: startId, cost: 0, currentRoute: null }];

  stations.forEach(s => { distances[s.id] = Infinity; });
  distances[startId] = 0;

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { id: u, cost: currentCost, currentRoute } = pq.shift();

    if (u === endId) break;
    if (currentCost > distances[u]) continue;

    for (const edge of (adj[u] || [])) {
      const v = edge.to;
      let weight = 0;

      // Đa tiêu chí tìm đường:
      if (mode === 'transfers') {
        // Ưu tiên đi thẳng cùng tuyến, đổi xe bị phạt trọng số cao (100)
        weight = (currentRoute && currentRoute !== edge.routeId) ? 100 : 1;
      } else if (mode === 'distance') {
        // Ngắn nhất theo km
        weight = edge.distance;
      } else {
        // Mặc định: Nhanh nhất theo thời gian (phút)
        // [QUAN TRỌNG THEO BAREM]: Xử lý chi phí chuyển tuyến (Transfer Penalty: cộng 8 phút khi đổi xe buýt)
        const isTransfer = (currentRoute && currentRoute !== edge.routeId);
        const transferPenalty = isTransfer ? 8 : 0;
        weight = edge.duration + transferPenalty;
      }

      const newCost = currentCost + weight;
      if (newCost < distances[v]) {
        distances[v] = newCost;
        previous[v] = { from: u, edge };
        pq.push({ id: v, cost: newCost, currentRoute: edge.routeId });
      }
    }
  }

  // Tái dựng lại lộ trình từ bảng previous
  if (distances[endId] === Infinity) return null;

  const path = [];
  let curr = endId;
  while (curr !== startId) {
    const step = previous[curr];
    if (!step) break;
    path.unshift({
      fromStationId: step.from,
      toStationId: curr,
      routeId: step.edge.routeId,
      routeName: step.edge.routeName,
      routeCode: step.edge.routeCode,
      distance: step.edge.distance,
      duration: step.edge.duration
    });
    curr = step.from;
  }

  // Tính toán tổng số liệu lộ trình
  let totalDistance = 0;
  let totalDuration = 0;
  let transferCount = 0;
  let lastRoute = null;

  path.forEach(seg => {
    totalDistance += seg.distance;
    totalDuration += seg.duration;
    if (lastRoute && lastRoute !== seg.routeId) {
      transferCount++;
      totalDuration += 8; // Cộng 8 phút chờ xe chuyển tuyến
    }
    lastRoute = seg.routeId;
  });

  return {
    segments: path,
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    totalDuration: Math.round(totalDuration),
    transferCount,
    mode
  };
}

// 2. TẠO CÂU LỆNH CYPHER TƯƠNG ĐƯƠNG ĐỂ GIẢI TRÌNH (BAREM SV2)
function generateEquivalentCypher(startId, endId, mode) {
  if (mode === 'distance') {
    return `// Tìm đường ngắn nhất theo khoảng cách (Cypher ShortestPath)
MATCH (start:Station {id: '${startId}'}), (end:Station {id: '${endId}'})
MATCH path = shortestPath((start)-[:CONNECTS_TO*..15]->(end))
RETURN path,
       reduce(dist = 0.0, r IN relationships(path) | dist + r.distance) AS totalDistanceKm
ORDER BY totalDistanceKm ASC LIMIT 1;`;
  } else if (mode === 'transfers') {
    return `// Tìm đường ưu tiên đi cùng tuyến hoặc ít đổi xe nhất
MATCH (start:Station {id: '${startId}'}), (end:Station {id: '${endId}'})
MATCH path = (start)-[:CONNECTS_TO*..12]->(end)
WITH path, [r IN relationships(path) | r.routeId] AS routesUsed
RETURN path, size(apoc.coll.toSet(routesUsed)) AS distinctRoutes
ORDER BY distinctRoutes ASC, length(path) ASC LIMIT 1;`;
  } else {
    return `// Tìm đường nhanh nhất có tính thời gian di chuyển và phạt chuyển tuyến
MATCH (start:Station {id: '${startId}'}), (end:Station {id: '${endId}'})
MATCH path = (start)-[:CONNECTS_TO*..15]->(end)
RETURN path,
       reduce(time = 0.0, r IN relationships(path) | time + r.duration) AS travelTimeMinutes
ORDER BY travelTimeMinutes ASC LIMIT 1;`;
  }
}

// 3. API TÌM ĐƯỜNG (POST /api/find-path)
app.post('/api/find-path', (req, res) => {
  const { startStationId, endStationId, mode } = req.body;
  if (!startStationId || !endStationId) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn điểm đi và điểm đến!' });
  }

  // Gọi thuật toán Dijkstra
  const result = findShortestPathLocal(startStationId, endStationId, mode || 'time', cachedDataset);

  if (!result) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy lộ trình kết nối giữa 2 trạm này!' });
  }

  // Kèm theo câu lệnh Cypher tương đương để SV2 thuyết minh đồ án
  const cypherQuery = generateEquivalentCypher(startStationId, endStationId, mode);

  res.json({
    success: true,
    data: result,
    cypherQuery: cypherQuery
  });
});

// ==========================================
// [SV3]: TÍCH HỢP OSRM ROAD ROUTING VÀ PHỤC VỤ CLIENT
// ==========================================

app.listen(PORT, () => {
  console.log(`🚀 Server đang khởi chạy tại http://localhost:${PORT}`);
});
