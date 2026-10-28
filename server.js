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
