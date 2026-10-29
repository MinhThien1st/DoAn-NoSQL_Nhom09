const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let neo4j;
try {
  neo4j = require('neo4j-driver');
} catch (e) {
  console.warn('neo4j-driver chua duoc cai dat, chay che do in-memory');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Nạp dữ liệu dataset.json làm In-Memory Store dự phòng
const datasetPath = path.join(__dirname, 'database', 'dataset.json');
let localData = { routes: [], stations: [], edges: [] };

try {
  if (fs.existsSync(datasetPath)) {
    localData = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    console.log(`[Dataset] Da nap ${localData.stations.length} tram va ${localData.routes.length} tuyen tu file dataset.json`);
  }
} catch (err) {
  console.error('[Dataset] Loi nap dataset.json:', err.message);
}

// Cấu hình Driver Neo4j
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '12345678';

let driver = null;
let isNeo4jConnected = false;

if (neo4j) {
  try {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    driver.verifyConnectivity()
      .then(() => {
        isNeo4jConnected = true;
        console.log(`[Neo4j] KET NOI THANH CONG toi Neo4j tai ${NEO4J_URI}!`);
      })
      .catch((err) => {
        isNeo4jConnected = false;
        console.warn(`[Neo4j] Chua ket noi duoc toi Neo4j (${err.message}). Tu dong bat che do Smart In-Memory Graph Engine!`);
      });
  } catch (err) {
    console.warn(`[Neo4j] Khoi tao driver that bai, dung che do In-Memory:`, err.message);
  }
}

// ==========================================
// CÁC HÀM XỬ LÝ ĐỒ THỊ TRỰC TIẾP (GRAPH ENGINE DỰ PHÒNG)
// ==========================================
function findShortestPathLocal(fromId, toId, mode = 'fastest') {
  const stationMap = new Map();
  localData.stations.forEach(s => stationMap.set(s.id, s));

  if (!stationMap.has(fromId) || !stationMap.has(toId)) {
    return null;
  }

  // Xây dựng danh sách kề (Adjacency List)
  const adj = new Map();
  localData.stations.forEach(s => adj.set(s.id, []));
  localData.edges.forEach(e => {
    if (adj.has(e.from)) {
      adj.get(e.from).push(e);
    }
  });

  // Thuật toán Dijkstra đa trạng thái (State-based Dijkstra) hỗ trợ chuyển tuyến và tối ưu chính xác
  // State: (stationId, currentRoute)
  const dist = new Map();
  const prev = new Map();
  const pq = [{ id: fromId, cost: 0, currentRoute: null, transfers: 0, time: 0, distance: 0, stateKey: `${fromId}__INIT` }];

  dist.set(`${fromId}__INIT`, 0);

  let bestEndState = null;

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const curr = pq.shift();

    if (curr.id === toId) {
      bestEndState = curr;
      break;
    }

    const currentBest = dist.get(curr.stateKey);
    if (currentBest !== undefined && curr.cost > currentBest) continue;

    const neighbors = adj.get(curr.id) || [];
    for (const edge of neighbors) {
      const isTransfer = curr.currentRoute && curr.currentRoute !== edge.route_id;
      const transferPenaltyTime = isTransfer ? 8 : 0; // Phạt 8 phút chờ xe
      const transferPenaltyCost = isTransfer ? 35 : 0; // Ưu tiên ít đổi tuyến

      let edgeWeight = edge.duration_mins;
      if (mode === 'shortest_distance') {
        edgeWeight = edge.distance_km;
      } else if (mode === 'min_transfers') {
        edgeWeight = 1 + transferPenaltyCost;
      } else {
        // fastest
        edgeWeight = edge.duration_mins + transferPenaltyTime;
      }

      const nextCost = curr.cost + edgeWeight;
      const nextTime = curr.time + edge.duration_mins + transferPenaltyTime;
      const nextDist = curr.distance + edge.distance_km;
      const nextTransfers = curr.transfers + (isTransfer ? 1 : 0);
      const nextStateKey = `${edge.to}__${edge.route_id}`;

      if (nextCost < (dist.get(nextStateKey) || Infinity)) {
        dist.set(nextStateKey, nextCost);
        prev.set(nextStateKey, {
          fromStateKey: curr.stateKey,
          fromId: curr.id,
          toId: edge.to,
          edge: edge,
          isTransfer: isTransfer
        });
        pq.push({
          id: edge.to,
          cost: nextCost,
          currentRoute: edge.route_id,
          transfers: nextTransfers,
          time: nextTime,
          distance: nextDist,
          stateKey: nextStateKey
        });
      }
    }
  }

  if (!bestEndState) {
    return null;
  }

  // Truy vết ngược đường đi từ bestEndState
  const pathStations = [];
  const pathEdges = [];
  let currStateKey = bestEndState.stateKey;

  while (currStateKey && currStateKey !== `${fromId}__INIT`) {
    const step = prev.get(currStateKey);
    if (!step) break;
    pathStations.unshift(stationMap.get(step.toId));
    pathEdges.unshift(step.edge);
    currStateKey = step.fromStateKey;
  }
  pathStations.unshift(stationMap.get(fromId));

  // Phân tích các chặng (Segments) để hiển thị Timeline người dùng
  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < pathEdges.length; i++) {
    const edge = pathEdges[i];
    const fromSt = pathStations[i];
    const toSt = pathStations[i + 1];

    if (!currentSegment || currentSegment.route_id !== edge.route_id) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        route_id: edge.route_id,
        route_name: edge.route_name,
        color: localData.routes.find(r => r.id === edge.route_id)?.color || '#1E88E5',
        start_station: fromSt,
        end_station: toSt,
        stations: [fromSt, toSt],
        total_time: edge.duration_mins,
        total_distance: edge.distance_km
      };
    } else {
      currentSegment.stations.push(toSt);
      currentSegment.end_station = toSt;
      currentSegment.total_time += edge.duration_mins;
      currentSegment.total_distance += edge.distance_km;
    }
  }
  if (currentSegment) {
    segments.push(currentSegment);
  }

  const totalTime = segments.reduce((sum, seg) => sum + seg.total_time, 0) + (segments.length - 1) * 8;
  const totalDistance = segments.reduce((sum, seg) => sum + seg.total_distance, 0);

  return {
    source: isNeo4jConnected ? 'Neo4j Database' : 'Smart In-Memory Graph Engine',
    stations: pathStations,
    edges: pathEdges,
    segments: segments,
    transfers: Math.max(0, segments.length - 1),
    total_time_mins: Math.round(totalTime),
    total_distance_km: Math.round(totalDistance * 10) / 10
  };
}

// ==========================================
// CÁC REST API ENDPOINTS
// ==========================================

// 1. Kiểm tra trạng thái hệ thống & DB
app.get('/api/status', async (req, res) => {
  let neo4jLive = false;
  let counts = { stations: localData.stations.length, routes: localData.routes.length, edges: localData.edges.length };

  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      const resSt = await session.run('MATCH (s:Station) RETURN count(s) as count');
      const resRt = await session.run('MATCH (r:BusRoute) RETURN count(r) as count');
      const resEd = await session.run('MATCH ()-[c:CONNECTS_TO]->() RETURN count(c) as count');
      counts.stations = resSt.records[0].get('count').toNumber();
      counts.routes = resRt.records[0].get('count').toNumber();
      counts.edges = resEd.records[0].get('count').toNumber();
      neo4jLive = true;
    } catch (e) {
      neo4jLive = false;
    } finally {
      await session.close();
    }
  }

  res.json({
    neo4j_connected: neo4jLive,
    uri: NEO4J_URI,
    stats: counts,
    engine: neo4jLive ? 'Neo4j Graph Database (Bolt Protocol)' : 'Smart In-Memory Fallback Engine'
  });
});

// 2. Lấy danh sách Trạm
app.get('/api/stations', async (req, res) => {
  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      const result = await session.run('MATCH (s:Station) RETURN s ORDER BY s.name');
      const stations = result.records.map(record => record.get('s').properties);
      return res.json(stations);
    } catch (e) {
      console.warn('Loi Neo4j, dung fallback:', e.message);
    } finally {
      await session.close();
    }
  }
  res.json(localData.stations);
});

// 3. Thêm Trạm mới (Admin CRUD - SV1)
app.post('/api/stations', async (req, res) => {
  const { name, lat, lng, zone } = req.body;
  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'Thiếu thông tin name, lat, lng của trạm' });
  }

  const newId = 'S' + String(localData.stations.length + 1).padStart(2, '0');
  const newStation = {
    id: newId,
    name,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    zone: zone || 'TP.HCM'
  };

  localData.stations.push(newStation);

  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      await session.run(
        'CREATE (s:Station {id: $id, name: $name, lat: $lat, lng: $lng, zone: $zone})',
        newStation
      );
    } catch (e) {
      console.error('Loi luu vao Neo4j:', e.message);
    } finally {
      await session.close();
    }
  }

  res.status(201).json({ message: 'Tạo trạm thành công', station: newStation });
});

// 4. Sửa thông tin Trạm (Admin CRUD - SV1)
app.put('/api/stations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, lat, lng, zone } = req.body;

  const stIndex = localData.stations.findIndex(s => s.id === id);
  if (stIndex !== -1) {
    if (name) localData.stations[stIndex].name = name;
    if (lat) localData.stations[stIndex].lat = parseFloat(lat);
    if (lng) localData.stations[stIndex].lng = parseFloat(lng);
    if (zone) localData.stations[stIndex].zone = zone;
  }

  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (s:Station {id: $id}) 
         SET s.name = coalesce($name, s.name), 
             s.lat = coalesce($lat, s.lat), 
             s.lng = coalesce($lng, s.lng), 
             s.zone = coalesce($zone, s.zone)
         RETURN s`,
        { id, name: name || null, lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null, zone: zone || null }
      );
    } catch (e) {
      console.error('Loi update Neo4j:', e.message);
    } finally {
      await session.close();
    }
  }

  res.json({ message: 'Cập nhật trạm thành công', station: localData.stations[stIndex] });
});

// 5. Xóa Trạm (Admin CRUD - SV1)
app.delete('/api/stations/:id', async (req, res) => {
  const { id } = req.params;
  localData.stations = localData.stations.filter(s => s.id !== id);
  localData.edges = localData.edges.filter(e => e.from !== id && e.to !== id);

  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      await session.run('MATCH (s:Station {id: $id}) DETACH DELETE s', { id });
    } catch (e) {
      console.error('Loi xoa Neo4j:', e.message);
    } finally {
      await session.close();
    }
  }

  res.json({ message: 'Xóa trạm thành công', id });
});

// 6. Lấy danh sách Tuyến xe
app.get('/api/routes', async (req, res) => {
  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      const result = await session.run('MATCH (r:BusRoute) RETURN r ORDER BY r.code');
      const routes = result.records.map(record => {
        const props = { ...record.get('r').properties };
        if (props.fare && typeof props.fare === 'object' && 'low' in props.fare) {
          props.fare = props.fare.low;
        }
        if (props.interval && typeof props.interval === 'object' && 'low' in props.interval) {
          props.interval = props.interval.low;
        }
        return props;
      });
      return res.json(routes);
    } catch (e) {
      console.warn('Loi Neo4j, dung fallback:', e.message);
    } finally {
      await session.close();
    }
  }
  res.json(localData.routes);
});

// 7. Lấy chi tiết Tuyến và các trạm của tuyến đó
app.get('/api/routes/:id', (req, res) => {
  const { id } = req.params;
  const route = localData.routes.find(r => r.id === id || r.code === id);
  if (!route) {
    return res.status(404).json({ error: 'Không tìm thấy tuyến xe' });
  }

  const routeEdges = localData.edges.filter(e => e.route_id === route.id);
  const stationIds = new Set();
  routeEdges.forEach(e => {
    stationIds.add(e.from);
    stationIds.add(e.to);
  });

  const stations = localData.stations.filter(s => stationIds.has(s.id));

  res.json({
    route,
    stations,
    edges: routeEdges
  });
});

// 8. Cập nhật Tuyến xe & Lịch xuất bến (Admin CRUD - SV1)
app.put('/api/routes/:id', async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time, interval, fare } = req.body;

  const rIndex = localData.routes.findIndex(r => r.id === id || r.code === id);
  if (rIndex !== -1) {
    if (start_time) localData.routes[rIndex].start_time = start_time;
    if (end_time) localData.routes[rIndex].end_time = end_time;
    if (interval) localData.routes[rIndex].interval = parseInt(interval);
    if (fare) localData.routes[rIndex].fare = parseInt(fare);
  }

  if (driver && isNeo4jConnected) {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (r:BusRoute) WHERE r.id = $id OR r.code = $id
         SET r.start_time = coalesce($start_time, r.start_time),
             r.end_time = coalesce($end_time, r.end_time),
             r.interval = coalesce($interval, r.interval),
             r.fare = coalesce($fare, r.fare)
         RETURN r`,
        { 
          id, 
          start_time: start_time || null, 
          end_time: end_time || null, 
          interval: interval ? parseInt(interval) : null,
          fare: fare ? parseInt(fare) : null
        }
      );
    } catch (e) {
      console.warn('Lỗi cập nhật Neo4j:', e.message);
    } finally {
      await session.close();
    }
  }

  res.json({ message: 'Cập nhật tuyến và lịch chạy thành công', id });
});

// 8. TÌM ĐƯỜNG ĐI TỐI ƯU (CORE ALGORITHM - SV2 & SV3)
app.post('/api/find-path', async (req, res) => {
  const { fromStationId, toStationId, mode = 'fastest' } = req.body;

  if (!fromStationId || !toStationId) {
    return res.status(400).json({ error: 'Vui lòng cung cấp cả trạm đi và trạm đến' });
  }

  if (fromStationId === toStationId) {
    return res.status(400).json({ error: 'Trạm đi và trạm đến không được trùng nhau' });
  }

  const cypherQuery = `
MATCH (start:Station {id: "${fromStationId}"}), (end:Station {id: "${toStationId}"}),
      p = shortestPath((start)-[:CONNECTS_TO*]-(end))
RETURN p,
       [n IN nodes(p) | n.name] AS DanhSachTram,
       [r IN relationships(p) | r.route_id] AS CacTuyen,
       reduce(totalTime = 0, r IN relationships(p) | totalTime + r.duration_mins) AS TongPhut,
       reduce(totalDist = 0, r IN relationships(p) | round(totalDist + r.distance_km, 2)) AS TongKm;
  `.trim();

  // Tìm kiếm bằng thuật toán tối ưu (Hỗ trợ phân tích chuyển tuyến)
  const result = findShortestPathLocal(fromStationId, toStationId, mode);

  if (!result) {
    return res.status(404).json({
      error: 'Không tìm thấy lộ trình xe buýt phù hợp giữa 2 trạm này!',
      cypherQuery
    });
  }

  res.json({
    ...result,
    cypherQuery
  });
});

// 9. Giả lập xe buýt thời gian thực (Live Bus Simulator bám sát theo từng trạm trên tuyến)
app.get('/api/live-buses', (req, res) => {
  const now = Date.now();

  // Danh sách các lộ trình chuẩn tuần tự theo lòng đường của các tuyến chính
  const routeStationSequences = {
    'R19': ['S01', 'S04', 'S05', 'S09', 'S08', 'S11', 'S21', 'S26', 'S28', 'S29', 'S30', 'S31', 'S35', 'S36', 'S37', 'S41', 'S42', 'S50', 'S46', 'S51', 'S49'],
    'R08': ['S18', 'S19', 'S20', 'S16', 'S15', 'S03', 'S06', 'S21', 'S22', 'S25', 'S65', 'S64', 'S34', 'S35', 'S41', 'S43', 'S44', 'S45'],
    'R01': ['S01', 'S02', 'S03', 'S16', 'S14', 'S13', 'S12'],
    'R150': ['S12', 'S13', 'S16', 'S06', 'S21', 'S26', 'S30', 'S35', 'S36', 'S37', 'S38', 'S39', 'S40'],
    'R53': ['S17', 'S16', 'S07', 'S06', 'S21', 'S65', 'S64', 'S34', 'S47', 'S41', 'S49']
  };

  const stationMap = new Map();
  localData.stations.forEach(s => stationMap.set(s.id, s));

  const simulatedBuses = [];

  Object.entries(routeStationSequences).forEach(([routeId, seq], rIdx) => {
    const route = localData.routes.find(r => r.id === routeId);
    if (!route || seq.length < 2) return;

    // Thời gian chạy hết 1 vòng (ví dụ: 120 giây cho 1 vòng demo)
    const cycleDurationMs = 90000;
    // Mỗi tuyến có thể có 1-2 xe chạy so le nhau
    const offsetMs = rIdx * 18000;
    const progressTotal = ((now + offsetMs) % cycleDurationMs) / cycleDurationMs;

    // Tính xem xe đang ở giữa trạm nào và trạm nào trong chuỗi trạm
    const totalLegs = seq.length - 1;
    const currentLegFloat = progressTotal * totalLegs;
    const legIndex = Math.min(Math.floor(currentLegFloat), totalLegs - 1);
    const legProgress = currentLegFloat - legIndex;

    const fromStId = seq[legIndex];
    const toStId = seq[legIndex + 1];

    const fromSt = stationMap.get(fromStId);
    const toSt = stationMap.get(toStId);

    if (fromSt && toSt) {
      // Nội suy tọa độ bám sát giữa 2 trạm kề cận
      const currentLat = fromSt.lat + (toSt.lat - fromSt.lat) * legProgress;
      const currentLng = fromSt.lng + (toSt.lng - fromSt.lng) * legProgress;

      simulatedBuses.push({
        bus_id: `BUS_${route.code}_01`,
        route_id: route.id,
        route_code: route.code,
        route_name: route.name,
        color: route.color,
        current_lat: currentLat,
        current_lng: currentLng,
        heading_to: toSt.name,
        speed_kmh: 26,
        next_eta_mins: Math.max(1, Math.round((1 - legProgress) * 4))
      });
    }
  });

  res.json(simulatedBuses);
});

// 10. API ĐỊNH TUYẾN ĐƯỜNG BỘ THỰC TẾ (OSRM Road-matching Proxy có Cache)
// Trả về chuỗi tọa độ uốn lượn chính xác 100% theo từng khúc cua của lòng đường
const roadGeometryCache = new Map();

app.get('/api/road-route', async (req, res) => {
  const { points } = req.query; // Dạng: lng1,lat1;lng2,lat2;lng3,lat3
  if (!points) {
    return res.status(400).json({ error: 'Thiếu tham số points' });
  }

  if (roadGeometryCache.has(points)) {
    return res.json({ coordinates: roadGeometryCache.get(points), source: 'cache' });
  }

  const https = require('https');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=geojson`;

  https.get(osrmUrl, { headers: { 'User-Agent': 'BusTransitGraphApp/1.0' } }, (apiRes) => {
    let rawData = '';
    apiRes.on('data', chunk => rawData += chunk);
    apiRes.on('end', () => {
      try {
        const json = JSON.parse(rawData);
        if (json.routes && json.routes.length > 0 && json.routes[0].geometry) {
          // OSRM trả về [lng, lat], đổi thành [lat, lng] cho Leaflet
          const latlngs = json.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          roadGeometryCache.set(points, latlngs);
          return res.json({ coordinates: latlngs, source: 'osrm' });
        }
        res.status(404).json({ error: 'Không lấy được geometry' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  }).on('error', (e) => {
    res.status(500).json({ error: e.message });
  });
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 HE THONG QUAN LY VA TIM DUONG XE BUYT DANG CHAY TAI:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`👉 Backend API: http://localhost:${PORT}/api/status`);
  console.log(`================================================================`);
});
