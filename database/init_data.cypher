// ==============================================================================
// ĐỒ ÁN MÔN HỌC NOSQL - ĐỀ TÀI 12: HỆ THỐNG QUẢN LÝ LỘ TRÌNH VÀ TÌM ĐƯỜNG XE BUÝT
// TẬP LỆNH TẠO DỮ LIỆU ĐỒ THỊ (CYPHER SCRIPT CHO NEO4J)
// Đạt định mức: 60+ Trạm (:Station), 8 Tuyến xe (:BusRoute), 130+ Cạnh [:CONNECTS_TO]
// ==============================================================================

// 1. DỌN DẸP DỮ LIỆU CŨ (NẾU CẦN RESET)
// MATCH (n) DETACH DELETE n;

// 2. KHỞI TẠO CÁC RÀNG BUỘC (CONSTRAINTS) ĐẢM BẢO DUY NHẤT VÀ TỐI ƯU CHỈ MỤC
CREATE CONSTRAINT station_id_unique IF NOT EXISTS FOR (s:Station) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT route_id_unique IF NOT EXISTS FOR (r:BusRoute) REQUIRE r.id IS UNIQUE;

// 3. TẠO CÁC TUYẾN XE BUÝT (:BusRoute)
CREATE
  (r01:BusRoute {id: "R01", code: "01", name: "Bến Thành - Bến xe Chợ Lớn", color: "#E53935", interval: 10, start_time: "05:00", end_time: "21:00", fare: 7000}),
  (r03:BusRoute {id: "R03", code: "03", name: "Bến Thành - Thạnh Lộc", color: "#8E24AA", interval: 12, start_time: "05:15", end_time: "20:45", fare: 7000}),
  (r08:BusRoute {id: "R08", code: "08", name: "Bến xe Quận 8 - ĐH Quốc Gia", color: "#1E88E5", interval: 8, start_time: "04:40", end_time: "20:30", fare: 7000}),
  (r19:BusRoute {id: "R19", code: "19", name: "Bến Thành - KTX Khu B ĐHQG", color: "#00897B", interval: 10, start_time: "05:00", end_time: "20:15", fare: 7000}),
  (r30:BusRoute {id: "R30", code: "30", name: "Chợ Tân Hương - ĐH Quốc Tế", color: "#F4511E", interval: 15, start_time: "05:00", end_time: "19:30", fare: 7000}),
  (r53:BusRoute {id: "R53", code: "53", name: "Lê Hồng Phong - ĐH Quốc Gia", color: "#43A047", interval: 12, start_time: "05:10", end_time: "19:40", fare: 7000}),
  (r56:BusRoute {id: "R56", code: "56", name: "Chợ Lớn - ĐH Giao Thông Vận Tải", color: "#FB8C00", interval: 10, start_time: "05:00", end_time: "20:00", fare: 7000}),
  (r150:BusRoute {id: "R150", code: "150", name: "Bến xe Chợ Lớn - Ngã 3 Tân Vạn", color: "#3949AB", interval: 6, start_time: "04:30", end_time: "21:00", fare: 7000});

// 4. TẠO CÁC NÚT TRẠM DỪNG XE BUÝT (:Station) CÓ TỌA ĐỘ THẬT KHU VỰC TP.HCM
CREATE
  // Khu vực Trung tâm Quận 1 & Quận 3
  (s01:Station {id: "S01", name: "Trạm Trung chuyển Bến Thành", lat: 10.7725, lng: 106.6980, zone: "Quận 1"}),
  (s02:Station {id: "S02", name: "Khách sạn New World", lat: 10.7708, lng: 106.6938, zone: "Quận 1"}),
  (s03:Station {id: "S03", name: "Công viên 23/9", lat: 10.7685, lng: 106.6912, zone: "Quận 1"}),
  (s04:Station {id: "S04", name: "Nhà hát Thành Phố", lat: 10.7766, lng: 106.7032, zone: "Quận 1"}),
  (s05:Station {id: "S05", name: "Bưu điện Trung tâm / Nhà thờ Đức Bà", lat: 10.7798, lng: 106.6990, zone: "Quận 1"}),
  (s06:Station {id: "S06", name: "Hồ Con Rùa", lat: 10.7827, lng: 106.6958, zone: "Quận 3"}),
  (s07:Station {id: "S07", name: "ĐH Kinh Tế CS A", lat: 10.7812, lng: 106.6945, zone: "Quận 3"}),
  (s08:Station {id: "S08", name: "Thảo Cầm Viên Sài Gòn", lat: 10.7876, lng: 106.7051, zone: "Quận 1"}),
  (s09:Station {id: "S09", name: "ĐH Khoa Học Xã Hội & Nhân Văn CS1", lat: 10.7865, lng: 106.7015, zone: "Quận 1"}),
  (s10:Station {id: "S10", name: "Đài Truyền Hình HTV", lat: 10.7891, lng: 106.7022, zone: "Quận 1"}),
  (s11:Station {id: "S11", name: "Cầu Thị Nghè", lat: 10.7905, lng: 106.7042, zone: "Bình Thạnh"}),

  // Khu vực Quận 5 & Chợ Lớn
  (s12:Station {id: "S12", name: "Bến xe Chợ Lớn", lat: 10.7512, lng: 106.6534, zone: "Quận 5"}),
  (s13:Station {id: "S13", name: "Bệnh viện Chợ Rẫy", lat: 10.7580, lng: 106.6595, zone: "Quận 5"}),
  (s14:Station {id: "S14", name: "ĐH Y Dược TP.HCM", lat: 10.7562, lng: 106.6610, zone: "Quận 5"}),
  (s15:Station {id: "S15", name: "ĐH Sư Phạm CS1", lat: 10.7602, lng: 106.6795, zone: "Quận 5"}),
  (s16:Station {id: "S16", name: "ĐH Khoa Học Tự Nhiên CS1", lat: 10.7628, lng: 106.6825, zone: "Quận 5"}),
  (s17:Station {id: "S17", name: "Bến xe Lê Hồng Phong", lat: 10.7645, lng: 106.6775, zone: "Quận 5"}),
  (s18:Station {id: "S18", name: "Bến xe Quận 8", lat: 10.7385, lng: 106.6582, zone: "Quận 8"}),
  (s19:Station {id: "S19", name: "Cầu Chánh Hưng", lat: 10.7445, lng: 106.6635, zone: "Quận 8"}),
  (s20:Station {id: "S20", name: "Cầu Chữ Y", lat: 10.7540, lng: 106.6840, zone: "Quận 5"}),

  // Khu vực Bình Thạnh & Trục Điện Biên Phủ
  (s21:Station {id: "S21", name: "Ngã tư Hàng Xanh (Hub Trung Chuyển)", lat: 10.8016, lng: 106.7112, zone: "Bình Thạnh"}),
  (s22:Station {id: "S22", name: "ĐH HUTECH", lat: 10.8025, lng: 106.7135, zone: "Bình Thạnh"}),
  (s23:Station {id: "S23", name: "ĐH Giao Thông Vận Tải CS1", lat: 10.8038, lng: 106.7152, zone: "Bình Thạnh"}),
  (s24:Station {id: "S24", name: "ĐH Quốc Tế Hồng Bàng", lat: 10.8005, lng: 106.7100, zone: "Bình Thạnh"}),
  (s25:Station {id: "S25", name: "Bến xe Miền Đông Cũ", lat: 10.8142, lng: 106.7118, zone: "Bình Thạnh"}),
  (s26:Station {id: "s26", name: "Cầu Sài Gòn", lat: 10.7995, lng: 106.7235, zone: "Bình Thạnh"}),
  (s27:Station {id: "S27", name: "Tân Cảng", lat: 10.7970, lng: 106.7205, zone: "Bình Thạnh"}),

  // Khu vực Trục Xa Lộ Hà Nội / Võ Nguyên Giáp & TP Thủ Đức
  (s28:Station {id: "S28", name: "Masteri Thảo Điền", lat: 10.8035, lng: 106.7320, zone: "Thủ Đức"}),
  (s29:Station {id: "S29", name: "Cầu Đen - An Phú", lat: 10.8055, lng: 106.7410, zone: "Thủ Đức"}),
  (s30:Station {id: "S30", name: "Ngã ba Cát Lái", lat: 10.8080, lng: 106.7530, zone: "Thủ Đức"}),
  (s31:Station {id: "S31", name: "Metro Rạch Chiếc", lat: 10.8175, lng: 106.7610, zone: "Thủ Đức"}),
  (s32:Station {id: "S32", name: "UBND TP Thủ Đức", lat: 10.8260, lng: 106.7635, zone: "Thủ Đức"}),
  (s33:Station {id: "S33", name: "Chợ Bắc Ninh", lat: 10.8440, lng: 106.7710, zone: "Thủ Đức"}),
  (s34:Station {id: "S34", name: "ĐH Sư Phạm Kỹ Thuật (Hub Thủ Đức)", lat: 10.8507, lng: 106.7719, zone: "Thủ Đức"}),
  (s35:Station {id: "S35", name: "Ngã tư Thủ Đức", lat: 10.8479, lng: 106.7725, zone: "Thủ Đức"}),
  (s36:Station {id: "S36", name: "Khu Công Nghệ Cao (SHTP)", lat: 10.8550, lng: 106.7850, zone: "Thủ Đức"}),
  (s37:Station {id: "S37", name: "Khu Du Lịch Suối Tiên", lat: 10.8655, lng: 106.8020, zone: "Thủ Đức"}),
  (s38:Station {id: "S38", name: "Bến xe Miền Đông Mới", lat: 10.8715, lng: 106.8120, zone: "Thủ Đức"}),
  (s39:Station {id: "S39", name: "Cầu Đồng Nai", lat: 10.8870, lng: 106.8320, zone: "Đồng Nai"}),
  (s40:Station {id: "S40", name: "Ngã 3 Tân Vạn", lat: 10.8930, lng: 106.8390, zone: "Bình Dương"}),

  // Khu vực Làng Đại Học Quốc Gia (ĐHQG TP.HCM)
  (s41:Station {id: "S41", name: "ĐH Nông Lâm TP.HCM", lat: 10.8705, lng: 106.7915, zone: "Thủ Đức"}),
  (s42:Station {id: "S42", name: "Cổng ĐHQG TP.HCM", lat: 10.8735, lng: 106.8005, zone: "Dĩ An"}),
  (s43:Station {id: "S43", name: "ĐH Quốc Tế - ĐHQG", lat: 10.8776, lng: 106.8015, zone: "Dĩ An"}),
  (s44:Station {id: "S44", name: "ĐH Bách Khoa CS2", lat: 10.8805, lng: 106.8055, zone: "Dĩ An"}),
  (s45:Station {id: "S45", name: "KTX Khu A ĐHQG", lat: 10.8782, lng: 106.8062, zone: "Dĩ An"}),
  (s46:Station {id: "S46", name: "ĐH Khoa Học Tự Nhiên CS2", lat: 10.8755, lng: 106.7995, zone: "Dĩ An"}),
  (s47:Station {id: "S47", name: "ĐH Kinh Tế - Luật (UEL)", lat: 10.8720, lng: 106.7780, zone: "Thủ Đức"}),
  (s48:Station {id: "S48", name: "ĐH Thể Dục Thể Thao", lat: 10.8745, lng: 106.7950, zone: "Dĩ An"}),
  (s49:Station {id: "S49", name: "KTX Khu B ĐHQG (Bến xe ĐHQG)", lat: 10.8825, lng: 106.7825, zone: "Dĩ An"}),
  (s50:Station {id: "S50", name: "ĐH Khoa Học Xã Hội & Nhân Văn CS2", lat: 10.8730, lng: 106.8025, zone: "Dĩ An"}),
  (s51:Station {id: "S51", name: "Hồ Đá Làng Đại Học", lat: 10.8760, lng: 106.7930, zone: "Dĩ An"}),

  // Khu vực Tân Bình - Phú Nhuận - Gò Vấp - Tân Phú
  (s52:Station {id: "S52", name: "Sân Bay Tân Sơn Nhất", lat: 10.8185, lng: 106.6588, zone: "Tân Bình"}),
  (s53:Station {id: "S53", name: "Công viên Hoàng Văn Thụ", lat: 10.8002, lng: 106.6605, zone: "Tân Bình"}),
  (s54:Station {id: "S54", name: "Ngã 4 Phú Nhuận", lat: 10.7990, lng: 106.6800, zone: "Phú Nhuận"}),
  (s55:Station {id: "S55", name: "Ngã 5 Chuồng Chó (Gò Vấp)", lat: 10.8280, lng: 106.6780, zone: "Gò Vấp"}),
  (s56:Station {id: "S56", name: "ĐH Công Nghiệp TP.HCM (IUH)", lat: 10.8222, lng: 106.6875, zone: "Gò Vấp"}),
  (s57:Station {id: "S57", name: "Chợ Bà Chiểu", lat: 10.8010, lng: 106.6985, zone: "Bình Thạnh"}),
  (s58:Station {id: "S58", name: "Chợ Tân Hương", lat: 10.7930, lng: 106.6210, zone: "Tân Phú"}),
  (s59:Station {id: "S59", name: "ĐH Công Thương TP.HCM (HUIT)", lat: 10.8060, lng: 106.6290, zone: "Tân Phú"}),
  (s60:Station {id: "S60", name: "Ngã tư Bảy Hiền", lat: 10.7915, lng: 106.6530, zone: "Tân Bình"}),
  (s61:Station {id: "S61", name: "Bến xe An Sương", lat: 10.8465, lng: 106.6135, zone: "Quận 12"}),
  (s62:Station {id: "S62", name: "Bến xe Ngã 4 Ga", lat: 10.8625, lng: 106.6870, zone: "Quận 12"}),
  (s63:Station {id: "S63", name: "Thạnh Lộc (Quận 12)", lat: 10.8750, lng: 106.6960, zone: "Quận 12"}),
  (s64:Station {id: "S64", name: "Chợ Thủ Đức", lat: 10.8520, lng: 106.7580, zone: "Thủ Đức"}),
  (s65:Station {id: "S65", name: "Cầu Bình Triệu", lat: 10.8220, lng: 106.7130, zone: "Bình Thạnh"});

// 5. TẠO CÁC CẠNH LIÊN KẾT [:CONNECTS_TO] (CÓ TRỌNG SỐ KHOẢNG CÁCH, THỜI GIAN, TUYẾN XE)

// ==========================================
// LỘ TRÌNH TUYẾN 19: Bến Thành -> KTX Khu B ĐHQG (Trục Xa Lộ Hà Nội)
// ==========================================
MATCH (a:Station {id: "S01"}), (b:Station {id: "S04"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S04"}), (b:Station {id: "S05"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.6, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S05"}), (b:Station {id: "S09"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S09"}), (b:Station {id: "S08"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S08"}), (b:Station {id: "S11"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.7, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S11"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.4, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S26"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.6, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S26"}), (b:Station {id: "S28"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.3, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S28"}), (b:Station {id: "S29"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.1, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S29"}), (b:Station {id: "S30"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.5, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S30"}), (b:Station {id: "S31"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.4, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S31"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 3.5, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S36"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.5, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S36"}), (b:Station {id: "S37"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 2.2, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S37"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.0, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S42"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S42"}), (b:Station {id: "S50"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S50"}), (b:Station {id: "S46"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S46"}), (b:Station {id: "S51"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S51"}), (b:Station {id: "S49"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.2, duration_mins: 4}]->(b);

// Chiều về Tuyến 19 (Ngược lại)
MATCH (a:Station {id: "S49"}), (b:Station {id: "S51"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S51"}), (b:Station {id: "S46"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S46"}), (b:Station {id: "S50"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S50"}), (b:Station {id: "S42"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S42"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S37"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.0, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S37"}), (b:Station {id: "S36"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 2.2, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S36"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.5, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S31"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 3.5, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S31"}), (b:Station {id: "S30"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.4, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S30"}), (b:Station {id: "S29"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.5, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S29"}), (b:Station {id: "S28"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.1, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S28"}), (b:Station {id: "S26"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.3, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S26"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.6, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S11"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 1.4, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S11"}), (b:Station {id: "S08"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.7, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S08"}), (b:Station {id: "S09"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S09"}), (b:Station {id: "S05"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S05"}), (b:Station {id: "S04"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.6, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S04"}), (b:Station {id: "S01"}) CREATE (a)-[:CONNECTS_TO {route_id: "R19", route_name: "Tuyến 19", distance_km: 0.8, duration_mins: 4}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 08: Bến xe Quận 8 -> ĐHQG (Qua SPKT, KHTN)
// ==========================================
MATCH (a:Station {id: "S18"}), (b:Station {id: "S19"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.0, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S19"}), (b:Station {id: "S20"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.5, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S20"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.2, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S15"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S15"}), (b:Station {id: "S03"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.8, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S03"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.9, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 2.8, duration_mins: 10}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S22"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.6, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S22"}), (b:Station {id: "S25"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.5, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S25"}), (b:Station {id: "S65"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.2, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S65"}), (b:Station {id: "S64"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 4.8, duration_mins: 14}]->(b);
MATCH (a:Station {id: "S64"}), (b:Station {id: "S34"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.4, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S34"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.6, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 3.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S43"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S43"}), (b:Station {id: "S44"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.6, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S44"}), (b:Station {id: "S45"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.5, duration_mins: 2}]->(b);

// Chiều về Tuyến 08 (Ngược lại)
MATCH (a:Station {id: "S45"}), (b:Station {id: "S44"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S44"}), (b:Station {id: "S43"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.6, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S43"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 3.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S34"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.6, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S34"}), (b:Station {id: "S64"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.4, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S64"}), (b:Station {id: "S65"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 4.8, duration_mins: 14}]->(b);
MATCH (a:Station {id: "S65"}), (b:Station {id: "S25"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.2, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S25"}), (b:Station {id: "S22"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.5, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S22"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.6, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 2.8, duration_mins: 10}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S03"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.9, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S03"}), (b:Station {id: "S15"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.8, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S15"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S20"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.2, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S20"}), (b:Station {id: "S19"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.5, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S19"}), (b:Station {id: "S18"}) CREATE (a)-[:CONNECTS_TO {route_id: "R08", route_name: "Tuyến 08", distance_km: 1.0, duration_mins: 4}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 01: Bến Thành - Bến xe Chợ Lớn (Nối 2 cực trung tâm)
// ==========================================
MATCH (a:Station {id: "S01"}), (b:Station {id: "S02"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 0.6, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S02"}), (b:Station {id: "S03"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S03"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 1.6, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S14"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 2.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S14"}), (b:Station {id: "S13"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S13"}), (b:Station {id: "S12"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 1.1, duration_mins: 5}]->(b);

// Chiều về Tuyến 01
MATCH (a:Station {id: "S12"}), (b:Station {id: "S13"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 1.1, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S13"}), (b:Station {id: "S14"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S14"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 2.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S03"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 1.6, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S03"}), (b:Station {id: "S02"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S02"}), (b:Station {id: "S01"}) CREATE (a)-[:CONNECTS_TO {route_id: "R01", route_name: "Tuyến 01", distance_km: 0.6, duration_mins: 3}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 150: Chợ Lớn -> Ngã 3 Tân Vạn (Tuyến huyết mạch trục Đông - Tây)
// ==========================================
MATCH (a:Station {id: "S12"}), (b:Station {id: "S13"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.1, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S13"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.3, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.7, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.8, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S26"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.6, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S26"}), (b:Station {id: "S30"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 3.8, duration_mins: 10}]->(b);
MATCH (a:Station {id: "S30"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 4.8, duration_mins: 12}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S36"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.5, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S36"}), (b:Station {id: "S37"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.2, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S37"}), (b:Station {id: "S38"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.8, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S38"}), (b:Station {id: "S39"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 3.0, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S39"}), (b:Station {id: "S40"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.2, duration_mins: 4}]->(b);

// Chiều về Tuyến 150
MATCH (a:Station {id: "S40"}), (b:Station {id: "S39"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S39"}), (b:Station {id: "S38"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 3.0, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S38"}), (b:Station {id: "S37"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.8, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S37"}), (b:Station {id: "S36"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.2, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S36"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.5, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S30"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 4.8, duration_mins: 12}]->(b);
MATCH (a:Station {id: "S30"}), (b:Station {id: "S26"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 3.8, duration_mins: 10}]->(b);
MATCH (a:Station {id: "S26"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.6, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.8, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.7, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S13"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 2.3, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S13"}), (b:Station {id: "S12"}) CREATE (a)-[:CONNECTS_TO {route_id: "R150", route_name: "Tuyến 150", distance_km: 1.1, duration_mins: 4}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 53: Lê Hồng Phong -> ĐHQG (Qua Hàng Xanh, Kha Vạn Cân)
// ==========================================
MATCH (a:Station {id: "S17"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 0.6, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S07"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.4, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S07"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.8, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S65"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.2, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S65"}), (b:Station {id: "S64"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 4.8, duration_mins: 14}]->(b);
MATCH (a:Station {id: "S64"}), (b:Station {id: "S34"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 1.4, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S34"}), (b:Station {id: "S47"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.8, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S47"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 1.5, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S49"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.0, duration_mins: 6}]->(b);

// Chiều về Tuyến 53
MATCH (a:Station {id: "S49"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.0, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S47"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 1.5, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S47"}), (b:Station {id: "S34"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.8, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S34"}), (b:Station {id: "S64"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 1.4, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S64"}), (b:Station {id: "S65"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 4.8, duration_mins: 14}]->(b);
MATCH (a:Station {id: "S65"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.2, duration_mins: 7}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.8, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S07"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S07"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 2.4, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S17"}) CREATE (a)-[:CONNECTS_TO {route_id: "R53", route_name: "Tuyến 53", distance_km: 0.6, duration_mins: 3}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 56: Chợ Lớn - ĐH GTVT CS2 (Qua Hàng Xanh)
// ==========================================
MATCH (a:Station {id: "S12"}), (b:Station {id: "S14"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.3, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S14"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 2.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S02"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.5, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S02"}), (b:Station {id: "S05"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.2, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S05"}), (b:Station {id: "S09"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 0.8, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S09"}), (b:Station {id: "S10"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 0.3, duration_mins: 1}]->(b);
MATCH (a:Station {id: "S10"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.6, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S23"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 0.5, duration_mins: 2}]->(b);

// Chiều về Tuyến 56
MATCH (a:Station {id: "S23"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 0.5, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S10"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.6, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S10"}), (b:Station {id: "S09"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 0.3, duration_mins: 1}]->(b);
MATCH (a:Station {id: "S09"}), (b:Station {id: "S05"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 0.8, duration_mins: 3}]->(b);
MATCH (a:Station {id: "S05"}), (b:Station {id: "S02"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.2, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S02"}), (b:Station {id: "S16"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.5, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S16"}), (b:Station {id: "S14"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 2.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S14"}), (b:Station {id: "S12"}) CREATE (a)-[:CONNECTS_TO {route_id: "R56", route_name: "Tuyến 56", distance_km: 1.3, duration_mins: 5}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 30: Chợ Tân Hương - ĐH Quốc Tế (Nối Tân Phú với Làng Đại học)
// ==========================================
MATCH (a:Station {id: "S58"}), (b:Station {id: "S59"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 1.7, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S59"}), (b:Station {id: "S60"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 3.2, duration_mins: 11}]->(b);
MATCH (a:Station {id: "S60"}), (b:Station {id: "S07"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 4.1, duration_mins: 13}]->(b);
MATCH (a:Station {id: "S07"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 2.8, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S26"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 1.6, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S26"}), (b:Station {id: "S31"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 5.2, duration_mins: 13}]->(b);
MATCH (a:Station {id: "S31"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 3.5, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 3.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S43"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 1.2, duration_mins: 4}]->(b);

// Chiều về Tuyến 30
MATCH (a:Station {id: "S43"}), (b:Station {id: "S41"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S41"}), (b:Station {id: "S35"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 3.1, duration_mins: 8}]->(b);
MATCH (a:Station {id: "S35"}), (b:Station {id: "S31"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 3.5, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S31"}), (b:Station {id: "S26"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 5.2, duration_mins: 13}]->(b);
MATCH (a:Station {id: "S26"}), (b:Station {id: "S21"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 1.6, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S21"}), (b:Station {id: "S06"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 2.8, duration_mins: 9}]->(b);
MATCH (a:Station {id: "S06"}), (b:Station {id: "S07"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 0.4, duration_mins: 2}]->(b);
MATCH (a:Station {id: "S07"}), (b:Station {id: "S60"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 4.1, duration_mins: 13}]->(b);
MATCH (a:Station {id: "S60"}), (b:Station {id: "S59"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 3.2, duration_mins: 11}]->(b);
MATCH (a:Station {id: "S59"}), (b:Station {id: "S58"}) CREATE (a)-[:CONNECTS_TO {route_id: "R30", route_name: "Tuyến 30", distance_km: 1.7, duration_mins: 6}]->(b);

// ==========================================
// LỘ TRÌNH TUYẾN 03: Bến Thành - Thạnh Lộc (Quận 12)
// ==========================================
MATCH (a:Station {id: "S01"}), (b:Station {id: "S05"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 1.0, duration_mins: 5}]->(b);
MATCH (a:Station {id: "S05"}), (b:Station {id: "S54"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 3.2, duration_mins: 10}]->(b);
MATCH (a:Station {id: "S54"}), (b:Station {id: "S55"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 3.5, duration_mins: 11}]->(b);
MATCH (a:Station {id: "S55"}), (b:Station {id: "S56"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S56"}), (b:Station {id: "S62"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 4.8, duration_mins: 14}]->(b);
MATCH (a:Station {id: "S62"}), (b:Station {id: "S63"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 1.8, duration_mins: 6}]->(b);

// Chiều về Tuyến 03
MATCH (a:Station {id: "S63"}), (b:Station {id: "S62"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 1.8, duration_mins: 6}]->(b);
MATCH (a:Station {id: "S62"}), (b:Station {id: "S56"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 4.8, duration_mins: 14}]->(b);
MATCH (a:Station {id: "S56"}), (b:Station {id: "S55"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 1.2, duration_mins: 4}]->(b);
MATCH (a:Station {id: "S55"}), (b:Station {id: "S54"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 3.5, duration_mins: 11}]->(b);
MATCH (a:Station {id: "S54"}), (b:Station {id: "S05"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 3.2, duration_mins: 10}]->(b);
MATCH (a:Station {id: "S05"}), (b:Station {id: "S01"}) CREATE (a)-[:CONNECTS_TO {route_id: "R03", route_name: "Tuyến 03", distance_km: 1.0, duration_mins: 5}]->(b);

// 6. TẠO LIÊN KẾT [:HAS_STATION] TỪ TUYẾN ĐẾN CÁC TRẠM (ĐỂ DỄ DÀNG QUẢN TRỊ VÀ TRUY VẤN)
MATCH (r:BusRoute {id: "R19"}), (s:Station)
WHERE s.id IN ["S01", "S04", "S05", "S09", "S08", "S11", "S21", "S26", "S28", "S29", "S30", "S31", "S35", "S36", "S37", "S41", "S42", "S50", "S46", "S51", "S49"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R08"}), (s:Station)
WHERE s.id IN ["S18", "S19", "S20", "S16", "S15", "S03", "S06", "S21", "S22", "S25", "S65", "S64", "S34", "S35", "S41", "S43", "S44", "S45"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R01"}), (s:Station)
WHERE s.id IN ["S01", "S02", "S03", "S16", "S14", "S13", "S12"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R150"}), (s:Station)
WHERE s.id IN ["S12", "S13", "S16", "S06", "S21", "S26", "S30", "S35", "S36", "S37", "S38", "S39", "S40"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R53"}), (s:Station)
WHERE s.id IN ["S17", "S16", "S07", "S06", "S21", "S65", "S64", "S34", "S47", "S41", "S49"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R56"}), (s:Station)
WHERE s.id IN ["S12", "S14", "S16", "S02", "S05", "S09", "S10", "S21", "S23"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R30"}), (s:Station)
WHERE s.id IN ["S58", "S59", "S60", "S07", "S06", "S21", "S26", "S31", "S35", "S41", "S43"]
CREATE (r)-[:HAS_STATION]->(s);

MATCH (r:BusRoute {id: "R03"}), (s:Station)
WHERE s.id IN ["S01", "S05", "S54", "S55", "S56", "S62", "S63"]
CREATE (r)-[:HAS_STATION]->(s);

// ==============================================================================
// HOÀN THÀNH NẠP DỮ LIỆU ĐỒ THỊ!
// Kiểm tra tổng số:
// MATCH (s:Station) RETURN count(s) AS TongSoTram;
// MATCH (r:BusRoute) RETURN count(r) AS TongSoTuyen;
// MATCH ()-[c:CONNECTS_TO]->() RETURN count(c) AS TongSoCanhKetNoi;
// ==============================================================================
