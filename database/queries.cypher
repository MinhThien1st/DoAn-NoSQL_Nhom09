// ==============================================================================
// ĐỒ ÁN MÔN HỌC NOSQL - BỘ CÂU TRUY VẤN NÂNG CAO CHO SV2 (CYPHER QUERIES)
// ==============================================================================

// 1. TÌM ĐƯỜNG ĐI QUA ÍT TRẠM NHẤT GIỮA 2 TRẠM BẤT KỲ (SHORTEST PATH)
// Ví dụ: Từ Trạm "ĐH Sư Phạm Kỹ Thuật" đến "Chợ Bến Thành"
MATCH (start:Station {name: "ĐH Sư Phạm Kỹ Thuật (Hub Thủ Đức)"}), 
      (end:Station {name: "Trạm Trung chuyển Bến Thành"}),
      p = shortestPath((start)-[:CONNECTS_TO*]-(end))
RETURN p;

// Trả về chi tiết các thông số của lộ trình:
MATCH (start:Station {name: "ĐH Sư Phạm Kỹ Thuật (Hub Thủ Đức)"}), 
      (end:Station {name: "Trạm Trung chuyển Bến Thành"}),
      p = shortestPath((start)-[:CONNECTS_TO*]-(end))
RETURN 
  [n IN nodes(p) | n.name] AS DanhSachTram,
  [r IN relationships(p) | r.route_id] AS CacTuyenDiQua,
  length(p) AS SoChang,
  reduce(totalTime = 0, r IN relationships(p) | totalTime + r.duration_mins) AS TongThoiGianPhut,
  reduce(totalDist = 0, r IN relationships(p) | round(totalDist + r.distance_km, 2)) AS TongQuangDuongKm;

// ------------------------------------------------------------------------------
// 2. TÌM ĐƯỜNG ĐI NHANH NHẤT THEO THỜI GIAN (DIJKSTRA / APOC HOẶC GDS)
// Nếu dùng Neo4j có cài APOC:
// CALL apoc.algo.dijkstra(startNode, endNode, 'CONNECTS_TO', 'duration_mins')
// YIELD path, weight RETURN path, weight;

// Hoặc sử dụng Cypher thuần để duyệt và xếp hạng theo tổng thời gian:
MATCH (start:Station {id: "S01"}), (end:Station {id: "S49"}),
      p = (start)-[:CONNECTS_TO*..12]-(end)
WITH p, 
     reduce(totalTime = 0, r IN relationships(p) | totalTime + r.duration_mins) AS TongPhut,
     reduce(totalDist = 0, r IN relationships(p) | round(totalDist + r.distance_km, 2)) AS TongKm
ORDER BY TongPhut ASC
LIMIT 1
RETURN p, TongPhut, TongKm;

// ------------------------------------------------------------------------------
// 3. XỬ LÝ TRƯỜNG HỢP CHUYỂN TUYẾN (TRANSFER PENALTY)
// Ưu tiên các lộ trình có ít lần đổi mã route_id trên các chặng liên tiếp
// Nếu đổi route_id, cộng thêm 8 phút thời gian chờ xe
MATCH (start:Station {id: "S18"}), (end:Station {id: "S49"}),
      p = (start)-[:CONNECTS_TO*..15]-(end)
WITH p, [r IN relationships(p) | r.route_id] AS routes,
     reduce(totalTime = 0, r IN relationships(p) | totalTime + r.duration_mins) AS rawTime
WITH p, routes, rawTime,
     reduce(transfers = 0, i IN range(0, size(routes)-2) | 
        transfers + CASE WHEN routes[i] <> routes[i+1] THEN 1 ELSE 0 END) AS soLanChuyenTuyen
WITH p, routes, soLanChuyenTuyen, (rawTime + soLanChuyenTuyen * 8) AS TongThoiGianCoTinhCho
ORDER BY soLanChuyenTuyen ASC, TongThoiGianCoTinhCho ASC
LIMIT 3
RETURN [n IN nodes(p) | n.name] AS TramDiQua,
       routes AS DanhSachTuyen,
       soLanChuyenTuyen,
       TongThoiGianCoTinhCho;

// ------------------------------------------------------------------------------
// 4. PHÂN TÍCH MẠNG LƯỚI: TÌM CÁC TRẠM TRUNG CHUYỂN QUAN TRỌNG NHẤT (HUB STATIONS)
// Đếm số lượng tuyến xe buýt cùng đi qua một trạm
MATCH (s:Station)<-[:HAS_STATION]-(r:BusRoute)
RETURN s.id AS MaTram, s.name AS TenTram, count(r) AS SoLuongTuyenDiQua, collect(r.code) AS CacTuyen
ORDER BY SoLuongTuyenDiQua DESC
LIMIT 10;

// ------------------------------------------------------------------------------
// 5. TRUY VẤN TOÀN BỘ LỘ TRÌNH CỦA 1 TUYẾN XE THEO MÃ CODE
MATCH (r:BusRoute {code: "19"})-[:HAS_STATION]->(s:Station)
RETURN r.name AS TenTuyen, collect(s.name) AS DanhSachTram;
