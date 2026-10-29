// ==============================================================================
// BUSGRAPH TRANSIT - LOGIC FRONTEND & BẢN ĐỒ TƯƠNG TÁC LEAFLET
// ==============================================================================

let map;
let stationMarkers = new Map();
let currentRouteLayers = [];
let liveBusMarkers = [];
let allStations = [];
let allRoutes = [];
let isSimulationActive = true;
let simulationInterval = null;

// Quản lý Token phiên đăng nhập Quản trị viên
let adminToken = sessionStorage.getItem('bus_admin_token') || null;

// Khởi tạo ứng dụng khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initTabs();
  initAdminAuth();
  initNearMeFeature();
  initGraphAnalyticsFeature();
  loadDbStatus();
  loadStations();
  loadRoutes();
  setupEventListeners();
  startLiveBusSimulation();
});

// 1. Khởi tạo bản đồ Leaflet
function initMap() {
  // Trung tâm TP.HCM bao quát từ Quận 1, Quận 5 đến Thủ Đức và ĐHQG
  map = L.map('map', {
    zoomControl: false
  }).setView([10.8200, 106.7500], 12);

  // Thêm nút zoom ở góc phải dưới
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Bản đồ Google Maps Chuẩn (Đầy đủ đường phố tiếng Việt, load siêu nhanh, KHÔNG CẦN API KEY)
  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps Transit'
  }).addTo(map);

  // Sự kiện click lên bản đồ để lấy tọa độ (hỗ trợ Admin)
  map.on('click', (e) => {
    const latInput = document.getElementById('addStationLat');
    const lngInput = document.getElementById('addStationLng');
    if (latInput && lngInput) {
      latInput.value = e.latlng.lat.toFixed(6);
      lngInput.value = e.latlng.lng.toFixed(6);
    }
  });

  // Đảm bảo Leaflet tính toán chuẩn kích thước container bản đồ
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);
}

// 2. Chuyển đổi giữa các Tab Sidebar
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTabId = btn.getAttribute('data-tab');
      document.getElementById(targetTabId).classList.add('active');

      // Refresh bản đồ khi đổi tab
      setTimeout(() => map.invalidateSize(), 200);
    });
  });
}

// ==============================================================================
// HỆ THỐNG XÁC THỰC QUẢN TRỊ VIÊN (ADMIN AUTHENTICATION & RBAC)
// ==============================================================================
function initAdminAuth() {
  updateAdminUI();

  // Nút trên Navbar
  const btnAuth = document.getElementById('btnAdminAuth');
  if (btnAuth) {
    btnAuth.addEventListener('click', () => {
      if (adminToken) {
        if (confirm('Bạn có muốn đăng xuất khỏi phiên Quản trị viên (Admin) không?')) {
          handleAdminLogout();
        }
      } else {
        openAdminModal();
      }
    });
  }

  // Nút mở modal từ màn hình khóa tab Admin
  const btnTrigger = document.getElementById('btnTriggerLoginModal');
  if (btnTrigger) {
    btnTrigger.addEventListener('click', openAdminModal);
  }

  // Nút đóng modal
  const btnClose = document.getElementById('btnCloseAdminModal');
  if (btnClose) {
    btnClose.addEventListener('click', closeAdminModal);
  }

  // Đóng modal khi click ra ngoài overlay
  const modalOverlay = document.getElementById('adminAuthModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAdminModal();
    });
  }

  // Submit form đăng nhập
  const formAuth = document.getElementById('formAdminAuth');
  if (formAuth) {
    formAuth.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('adminUsernameInput').value.trim();
      const p = document.getElementById('adminPasswordInput').value.trim();
      await executeAdminLogin(u, p);
    });
  }

  // Đăng nhập nhanh 1-Click Demo
  const btnQuick = document.getElementById('btnQuickDemoAuth');
  if (btnQuick) {
    btnQuick.addEventListener('click', async () => {
      await executeAdminLogin('admin', '123456');
    });
  }

  // Nút đăng xuất bên trong tab Admin
  const btnLogout = document.getElementById('btnLogoutAdmin');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleAdminLogout);
  }
}

function updateAdminUI() {
  const btnAuth = document.getElementById('btnAdminAuth');
  const authLabel = document.getElementById('adminAuthLabel');
  const lockTag = document.getElementById('adminLockTag');
  const lockedGuard = document.getElementById('adminLockedGuard');
  const unlockedArea = document.getElementById('adminUnlockedArea');

  if (adminToken) {
    // Đã đăng nhập
    if (btnAuth) {
      btnAuth.classList.add('logged-in');
      btnAuth.title = 'Đang đăng nhập: Admin (Click để đăng xuất)';
    }
    if (authLabel) authLabel.innerHTML = '<i class="fa-solid fa-circle-check text-success"></i> Quản trị viên';
    if (lockTag) {
      lockTag.classList.add('unlocked');
      lockTag.innerHTML = '<i class="fa-solid fa-unlock"></i>';
    }
    if (lockedGuard) lockedGuard.style.display = 'none';
    if (unlockedArea) unlockedArea.style.display = 'block';
  } else {
    // Chưa đăng nhập
    if (btnAuth) {
      btnAuth.classList.remove('logged-in');
      btnAuth.title = 'Đăng nhập tài khoản Quản trị viên';
    }
    if (authLabel) authLabel.innerHTML = 'Đăng nhập Admin';
    if (lockTag) {
      lockTag.classList.remove('unlocked');
      lockTag.innerHTML = '<i class="fa-solid fa-lock"></i>';
    }
    if (lockedGuard) lockedGuard.style.display = 'block';
    if (unlockedArea) unlockedArea.style.display = 'none';
  }
}

function openAdminModal() {
  const modal = document.getElementById('adminAuthModal');
  const alertBox = document.getElementById('adminLoginAlert');
  if (alertBox) alertBox.style.display = 'none';
  if (modal) modal.classList.add('show');
}

function closeAdminModal() {
  const modal = document.getElementById('adminAuthModal');
  if (modal) modal.classList.remove('show');
}

async function executeAdminLogin(username, password) {
  const alertBox = document.getElementById('adminLoginAlert');
  const btnSubmit = document.getElementById('btnSubmitLogin');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (alertBox) {
        alertBox.textContent = data.error || 'Tài khoản hoặc mật khẩu không chính xác!';
        alertBox.style.display = 'block';
      }
      return;
    }

    // Đăng nhập thành công
    adminToken = data.token;
    sessionStorage.setItem('bus_admin_token', adminToken);
    updateAdminUI();
    closeAdminModal();

    // Tự động chuyển sang Tab Admin ngay lập tức
    const tabAdminBtn = document.getElementById('tabAdminBtn');
    if (tabAdminBtn) tabAdminBtn.click();

  } catch (err) {
    if (alertBox) {
      alertBox.textContent = 'Lỗi kết nối máy chủ: ' + err.message;
      alertBox.style.display = 'block';
    }
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket me-1"></i> Đăng nhập Quản trị';
    }
  }
}

function handleAdminLogout() {
  adminToken = null;
  sessionStorage.removeItem('bus_admin_token');
  updateAdminUI();

  // Chuyển về Tab Tìm đường
  const defaultTab = document.querySelector('.tab-btn[data-tab="tab-routing"]');
  if (defaultTab) defaultTab.click();
}

// 3. Tải trạng thái kết nối CSDL
async function loadDbStatus() {
  const badge = document.getElementById('dbStatusBadge');
  const text = document.getElementById('dbStatusText');

  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.neo4j_connected) {
      badge.classList.add('connected');
      text.innerHTML = `<strong>Neo4j Live</strong> (${data.stats.stations} trạm, ${data.stats.edges} cạnh)`;
    } else {
      badge.classList.remove('connected');
      text.innerHTML = `<strong>Smart Engine</strong> (${data.stats.stations} trạm sẵn sàng)`;
    }

    // Cập nhật thống kê Admin
    const statSt = document.getElementById('adminStatStations');
    const statRt = document.getElementById('adminStatRoutes');
    const statEd = document.getElementById('adminStatEdges');
    if (statSt) statSt.textContent = data.stats.stations;
    if (statRt) statRt.textContent = data.stats.routes;
    if (statEd) statEd.textContent = data.stats.edges;
  } catch (err) {
    text.textContent = 'Chế độ In-Memory Sẵn sàng';
  }
}

// 4. Tải danh sách trạm và cắm mốc lên bản đồ
async function loadStations() {
  try {
    const res = await fetch('/api/stations');
    allStations = await res.json();

    const startSelect = document.getElementById('startStationSelect');
    const endSelect = document.getElementById('endStationSelect');

    startSelect.innerHTML = '<option value="">-- Chọn điểm đi (A) --</option>';
    endSelect.innerHTML = '<option value="">-- Chọn điểm đến (B) --</option>';

    // Tạo icon trạm buýt dạng biển báo 3D phát sáng nổi bật
    const busStopIcon = L.divIcon({
      className: 'custom-bus-stop-icon',
      html: `
        <div class="station-map-pin" title="Trạm xe buýt">
          <i class="fa-solid fa-bus"></i>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    allStations.forEach(station => {
      // Đổ vào 2 select box
      const opt1 = new Option(`${station.name} (${station.zone || 'TP.HCM'})`, station.id);
      const opt2 = new Option(`${station.name} (${station.zone || 'TP.HCM'})`, station.id);
      startSelect.add(opt1);
      endSelect.add(opt2);

      // Cắm marker lên Leaflet
      const marker = L.marker([station.lat, station.lng], { icon: busStopIcon });
      
      const popupContent = `
        <div class="station-popup">
          <h4><i class="fa-solid fa-bus text-primary"></i> ${station.name}</h4>
          <span class="zone-tag"><i class="fa-solid fa-map-pin"></i> ${station.zone || 'Khu vực TP.HCM'}</span>
          <p class="small text-muted">ID: ${station.id} | Tọa độ: ${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}</p>
          <div class="popup-actions">
            <button class="btn-xs btn-set-start" onclick="selectStationAs('${station.id}', 'start')">
              <i class="fa-solid fa-circle-play"></i> Đi từ đây (A)
            </button>
            <button class="btn-xs btn-set-end" onclick="selectStationAs('${station.id}', 'end')">
              <i class="fa-solid fa-flag-checkered"></i> Đến đây (B)
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(map);
      stationMarkers.set(station.id, marker);
    });

    // Mặc định chọn 2 trạm kinh điển để bấm thử là ra ngay
    if (startSelect.querySelector('option[value="S34"]')) {
      startSelect.value = 'S34'; // ĐH Sư Phạm Kỹ Thuật
    }
    if (endSelect.querySelector('option[value="S01"]')) {
      endSelect.value = 'S01'; // Chợ Bến Thành
    }

  } catch (err) {
    console.error('Loi tai danh sach tram:', err);
  }
}

// Hàm chọn trạm nhanh từ Popup
window.selectStationAs = function(stationId, type) {
  if (type === 'start') {
    document.getElementById('startStationSelect').value = stationId;
  } else {
    document.getElementById('endStationSelect').value = stationId;
  }
  map.closePopup();
};

// 5. Tải danh mục tuyến xe (Tab 2)
async function loadRoutes() {
  try {
    const res = await fetch('/api/routes');
    allRoutes = await res.json();

    const container = document.getElementById('routesListContainer');
    container.innerHTML = '';

    allRoutes.forEach(route => {
      const card = document.createElement('div');
      card.className = 'route-card';
      card.innerHTML = `
        <div class="route-card-left">
          <div class="route-num-badge" style="background-color: ${route.color || '#1E88E5'};">
            ${route.code}
          </div>
          <div>
            <div class="route-name">${route.name}</div>
            <div class="route-meta">
              <i class="fa-regular fa-clock"></i> ${route.start_time} - ${route.end_time} &bull; ${route.interval}p/chuyến &bull; ${route.fare.toLocaleString()}đ
            </div>
          </div>
        </div>
        <div>
          <button class="btn btn-sm btn-primary" onclick="viewRouteOnMap('${route.id}')" title="Xem tuyến trên bản đồ">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    // Điền dữ liệu vào form Quản trị sửa Tuyến (Admin)
    const editSelect = document.getElementById('editRouteSelect');
    if (editSelect) {
      editSelect.innerHTML = '<option value="">-- Chọn tuyến cần chỉnh sửa --</option>';
      allRoutes.forEach(r => {
        editSelect.add(new Option(`Tuyến ${r.code}: ${r.name}`, r.id));
      });
      editSelect.onchange = () => {
        const selected = allRoutes.find(r => r.id === editSelect.value);
        if (selected) {
          document.getElementById('editRouteStartTime').value = selected.start_time || '05:00';
          document.getElementById('editRouteEndTime').value = selected.end_time || '21:00';
          document.getElementById('editRouteInterval').value = selected.interval || 10;
          document.getElementById('editRouteFare').value = selected.fare || 7000;
        }
      };
    }
  } catch (err) {
    console.error('Loi tai tuyen xe:', err);
  }
}

// Hàm lấy hình học đường cong thực tế bám sát 100% lòng đường Google Maps (OSRM Router)
async function fetchRealRoadGeometry(stations) {
  if (!stations || stations.length < 2) return [];

  // Để đường đi bám sát 100% từng khúc cua của con đường thực tế,
  // chúng ta gửi toàn bộ danh sách trạm theo đúng chuỗi (nếu <= 25 trạm)
  // hoặc chia theo đoạn cửa sổ nối tiếp (chunks) nếu tuyến quá dài.
  try {
    if (stations.length <= 25) {
      const pointsStr = stations.map(s => `${s.lng},${s.lat}`).join(';');
      const res = await fetch(`/api/road-route?points=${pointsStr}`);
      const data = await res.json();
      if (data.coordinates && data.coordinates.length > 0) {
        return data.coordinates;
      }
    } else {
      // Chunking cho tuyến dài để OSRM xử lý tối ưu không làm mất khúc cua
      const allCoords = [];
      const chunkSize = 20;
      for (let i = 0; i < stations.length - 1; i += chunkSize - 1) {
        const chunk = stations.slice(i, i + chunkSize);
        if (chunk.length < 2) break;
        const pointsStr = chunk.map(s => `${s.lng},${s.lat}`).join(';');
        const res = await fetch(`/api/road-route?points=${pointsStr}`);
        const data = await res.json();
        if (data.coordinates && data.coordinates.length > 0) {
          if (allCoords.length > 0) {
            allCoords.push(...data.coordinates.slice(1));
          } else {
            allCoords.push(...data.coordinates);
          }
        } else {
          allCoords.push(...chunk.map(s => [s.lat, s.lng]));
        }
      }
      if (allCoords.length > 0) return allCoords;
    }
  } catch (err) {
    console.warn('Dùng fallback tọa độ trạm thẳng:', err.message);
  }

  // Fallback: trả về tọa độ trạm thẳng nếu mạng có vấn đề
  return stations.map(s => [s.lat, s.lng]);
}

// Xem toàn bộ tuyến trên bản đồ (Uốn cong bám sát mặt đường thực tế)
window.viewRouteOnMap = async function(routeId) {
  try {
    const res = await fetch(`/api/routes/${routeId}`);
    const data = await res.json();

    clearRouteLayers();

    if (data.stations.length === 0) return;

    // Lấy đường cong uốn lượn ôm khít lòng đường
    const roadLatLngs = await fetchRealRoadGeometry(data.stations);

    // Lớp viền phát sáng
    const glowLine = L.polyline(roadLatLngs, {
      color: '#FFFFFF',
      weight: 9,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Lớp line chính của tuyến xe
    const polyline = L.polyline(roadLatLngs, {
      color: data.route.color || '#059669',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    currentRouteLayers.push(glowLine);
    currentRouteLayers.push(polyline);
    map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

  } catch (err) {
    console.error('Loi hien thi tuyen:', err);
  }
};

// 6. Xử lý sự kiện Tìm đường (Core Algorithm)
function setupEventListeners() {
  // Nút đảo ngược điểm đi và đến
  document.getElementById('btnSwapStations').addEventListener('click', () => {
    const s = document.getElementById('startStationSelect');
    const e = document.getElementById('endStationSelect');
    const temp = s.value;
    s.value = e.value;
    e.value = temp;
  });

  // Nút tìm kiếm lộ trình
  document.getElementById('btnFindPath').addEventListener('click', handleFindPath);

  // Toggle xem Cypher Query
  document.getElementById('toggleCypherCode').addEventListener('click', () => {
    const box = document.getElementById('cypherCodeBox');
    const icon = document.getElementById('cypherChevron');
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    icon.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
  });

  // Căn bản đồ
  document.getElementById('btnFitMap').addEventListener('click', () => {
    if (allStations.length > 0) {
      const bounds = L.latLngBounds(allStations.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  });

  // Bật/Tắt mô phỏng xe chạy
  document.getElementById('btnToggleSim').addEventListener('click', function() {
    isSimulationActive = !isSimulationActive;
    this.querySelector('strong').textContent = isSimulationActive ? 'BẬT' : 'TẮT';
    if (!isSimulationActive) {
      clearLiveBuses();
    }
  });

  // Form thêm trạm (Admin CRUD)
  const addForm = document.getElementById('formAddStation');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!adminToken) {
        alert('Yêu cầu quyền Quản trị viên (Admin) để thực hiện thao tác này!');
        openAdminModal();
        return;
      }

      const name = document.getElementById('addStationName').value;
      const lat = document.getElementById('addStationLat').value;
      const lng = document.getElementById('addStationLng').value;
      const zone = document.getElementById('addStationZone').value;

      try {
        const res = await fetch('/api/stations', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ name, lat, lng, zone })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Lỗi thêm trạm!');
          return;
        }
        alert('Đã thêm trạm thành công vào CSDL Đồ thị Neo4j!');
        addForm.reset();
        loadStations();
        loadDbStatus();
      } catch (err) {
        alert('Lỗi thêm trạm: ' + err.message);
      }
    });
  }

  // Form sửa lịch trình tuyến xe (Admin CRUD)
  const updateRouteForm = document.getElementById('formUpdateRouteSchedule');
  if (updateRouteForm) {
    updateRouteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!adminToken) {
        alert('Yêu cầu quyền Quản trị viên (Admin) để cập nhật lịch trình tuyến!');
        openAdminModal();
        return;
      }

      const routeId = document.getElementById('editRouteSelect').value;
      const startTime = document.getElementById('editRouteStartTime').value;
      const endTime = document.getElementById('editRouteEndTime').value;
      const interval = document.getElementById('editRouteInterval').value;
      const fare = document.getElementById('editRouteFare').value;

      if (!routeId) {
        alert('Vui lòng chọn tuyến cần cập nhật!');
        return;
      }

      try {
        const res = await fetch(`/api/routes/${routeId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            start_time: startTime,
            end_time: endTime,
            interval: parseInt(interval),
            fare: parseInt(fare)
          })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Lỗi cập nhật lịch trình!');
          return;
        }
        alert('Đã cập nhật lịch xuất bến & giãn cách vào CSDL Đồ thị thành công!');
        loadRoutes();
      } catch (err) {
        alert('Lỗi cập nhật lịch trình tuyến: ' + err.message);
      }
    });
  }

  // Sự kiện bấm chọn các tab so sánh 3 phương án (Nhanh nhất vs Ngắn nhất vs Ít đổi xe)
  const compareTabBtns = document.querySelectorAll('.compare-tab-btn');
  compareTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      switchComparisonMode(mode);
    });
  });

  // Khi thay đổi radio button tiêu chí tìm kiếm -> tự động cập nhật tab so sánh
  const modeRadios = document.querySelectorAll('input[name="routingMode"]');
  modeRadios.forEach(r => {
    r.addEventListener('change', () => {
      if (currentComparisonResults) {
        switchComparisonMode(r.value);
      }
    });
  });
}

// Biến lưu trữ đồng thời cả 3 kết quả tính toán để so sánh trực quan
let currentComparisonResults = null;
let currentSelectedMode = 'fastest';

function switchComparisonMode(mode) {
  if (!currentComparisonResults) return;
  const resultData = currentComparisonResults[mode];
  if (!resultData) return;

  currentSelectedMode = mode;

  // Đổi trạng thái active trên các nút tab so sánh
  document.querySelectorAll('.compare-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  // Đồng bộ với radio button trong form tìm kiếm
  const radio = document.querySelector(`input[name="routingMode"][value="${mode}"]`);
  if (radio) radio.checked = true;

  // Vẽ lại lộ trình trên bản đồ và hiển thị timeline của phương án này
  displayRoutingResults(resultData);
}

// Hàm gán nhanh Cặp trạm so sánh mẫu (Demo Pairs cho Thầy/Cô test)
window.applyDemoPair = function(fromId, toId) {
  const startSelect = document.getElementById('startStationSelect');
  const endSelect = document.getElementById('endStationSelect');
  if (startSelect && endSelect) {
    startSelect.value = fromId;
    endSelect.value = toId;
    handleFindPath();
  }
};

// 7. Thực thi Tìm đường đi tối ưu & Tự động so sánh đồng thời 3 phương án
async function handleFindPath() {
  const fromId = document.getElementById('startStationSelect').value;
  const toId = document.getElementById('endStationSelect').value;
  const modeRadio = document.querySelector('input[name="routingMode"]:checked');
  const mode = modeRadio ? modeRadio.value : 'fastest';
  const trafficMode = document.getElementById('trafficModeSelect') ? document.getElementById('trafficModeSelect').value : 'normal';
  const passengerType = document.getElementById('passengerTypeSelect') ? document.getElementById('passengerTypeSelect').value : 'student';

  if (!fromId || !toId) {
    alert('Vui lòng chọn cả điểm xuất phát (A) và điểm đến (B)!');
    return;
  }

  if (fromId === toId) {
    alert('Điểm xuất phát và điểm đến không được trùng nhau!');
    return;
  }

  const btn = document.getElementById('btnFindPath');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang duyệt đồ thị & tính 3 phương án...';
  btn.disabled = true;

  try {
    // Gọi API so sánh đồng thời cả 3 tiêu chí: Nhanh nhất, Ngắn nhất, Ít đổi xe
    const res = await fetch('/api/find-path/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromStationId: fromId, toStationId: toId, trafficMode, passengerType })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Không tìm thấy lộ trình phù hợp!');
      return;
    }

    currentComparisonResults = data;

    // Cập nhật thông số tóm tắt lên 3 Tab so sánh
    const metaFastest = document.getElementById('metaFastest');
    const metaShortest = document.getElementById('metaShortest');
    const metaMinTransfer = document.getElementById('metaMinTransfer');

    if (data.fastest && metaFastest) {
      metaFastest.textContent = `${data.fastest.total_time_mins}p • ${data.fastest.total_distance_km}km`;
    }
    if (data.shortest_distance && metaShortest) {
      metaShortest.textContent = `${data.shortest_distance.total_time_mins}p • ${data.shortest_distance.total_distance_km}km`;
    }
    if (data.min_transfers && metaMinTransfer) {
      metaMinTransfer.textContent = `${data.min_transfers.transfers === 0 ? '0 đổi' : data.min_transfers.transfers + ' lần đổi'}`;
    }

    // Hiển thị kết quả của chế độ đang chọn
    switchComparisonMode(mode || 'fastest');

  } catch (err) {
    alert('Lỗi kết nối máy chủ: ' + err.message);
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-magnifying-glass-location"></i> Tìm Lộ Trình Tối Ưu';
    btn.disabled = false;
  }
}

// Biến quản lý bộ đếm lùi thời gian xe tới trạm
let etaCountdownInterval = null;

// 8. Hiển thị Kết quả Lộ trình lên UI & Map (Uốn lượn ôm sát 100% lòng đường thật)
async function displayRoutingResults(data) {
  document.getElementById('routingResults').style.display = 'block';

  // 1. Khởi tạo Bảng đếm lùi thời gian thực (Quy đổi demo: 1 phút = 2 giây)
  if (etaCountdownInterval) {
    clearInterval(etaCountdownInterval);
    etaCountdownInterval = null;
  }

  const startStation = data.stations[0];
  const firstRouteId = data.segments[0]?.route_id;
  const firstRoute = allRoutes.find(r => r.id === firstRouteId);
  const firstRouteCode = firstRoute ? firstRoute.code : '19';
  const routeIntervalMins = firstRoute ? firstRoute.interval : 10;

  // Thời gian xe tới ngoài đời: 3 phút -> Quy đổi demo: 3 * 2s = 6 giây
  const simulatedMinutes = 3;
  let remainingSeconds = simulatedMinutes * 2; // Đúng 6 giây xe sẽ tới trạm xuất phát!

  const alertContainerId = 'liveEtaAlertBox';
  let realtimeAlertHtml = `
    <div class="realtime-alert-card" id="${alertContainerId}" title="Nhấp để theo dõi vị trí xe buýt trên bản đồ">
      <div class="alert-icon"><i class="fa-solid fa-bus-simple"></i></div>
      <div class="alert-text">
        <div class="alert-header-row">
          <span class="live-pulse-badge"><span class="pulse-dot"></span> THEO DÕI TRỰC TIẾP</span>
          <span class="alert-click-hint"><i class="fa-solid fa-location-crosshairs"></i> Xem trên bản đồ</span>
        </div>
        <div class="alert-title">Xe buýt đang tiếp cận trạm xuất phát</div>
        <p class="alert-sub">Tuyến <b>${firstRouteCode}</b> &bull; Điểm đón: <strong>${startStation.name}</strong> (~${simulatedMinutes}p ngoài đời)</p>
        <div class="countdown-badge" id="etaCountdownDisplay">
          <i class="fa-solid fa-hourglass-half"></i> Xe sẽ cập bến sau: <strong>${remainingSeconds} giây</strong>
        </div>
      </div>
    </div>
  `;

  // Điền thẻ tổng quan
  document.getElementById('resTotalTime').textContent = `${data.total_time_mins} phút`;
  document.getElementById('resTotalDist').textContent = `${data.total_distance_km} km`;
  document.getElementById('resTransfers').textContent = data.transfers === 0 ? 'Đi thẳng (0 đổi)' : `${data.transfers} lần đổi`;

  // Điền giá vé tính toán thực tế (dùng non-breaking space để chữ đ không bao giờ rớt dòng)
  const fareEl = document.getElementById('resTotalFare');
  if (fareEl && data.fare_info) {
    fareEl.textContent = data.fare_info.total_fare > 0 
      ? `${data.fare_info.total_fare.toLocaleString('vi-VN')}\u00A0đ`
      : 'Miễn phí';
  }

  // Cảnh báo kẹt xe giờ cao điểm
  const rushNoticeEl = document.getElementById('resRushHourNotice');
  const delayMinsEl = document.getElementById('resDelayMins');
  if (rushNoticeEl) {
    if (data.is_rush_hour && data.traffic_delay_mins > 0) {
      if (delayMinsEl) delayMinsEl.textContent = `${data.traffic_delay_mins}`;
      rushNoticeEl.style.display = 'flex';
    } else {
      rushNoticeEl.style.display = 'none';
    }
  }

  // Điền câu Cypher
  document.getElementById('cypherCodeBox').textContent = data.cypherQuery;

  // Render Timeline
  const timeline = document.getElementById('timelineList');
  timeline.innerHTML = realtimeAlertHtml;

  // GẮN SỰ KIỆN CLICK VÀO THÔNG BÁO XE ĐANG TỚI -> TRỎ NGAY ĐẾN XE BUÝT TRÊN BẢN ĐỒ
  setTimeout(() => {
    const alertBox = document.getElementById(alertContainerId);
    if (alertBox) {
      alertBox.onclick = () => {
        if (journeyBusMarker) {
          map.flyTo(journeyBusMarker.getLatLng(), 17, { animate: true, duration: 1.2 });
          journeyBusMarker.openPopup();
        } else if (allPathLatLngs.length > 0) {
          map.flyTo(allPathLatLngs[0], 17, { animate: true, duration: 1.2 });
        }
      };
    }
  }, 100);

  clearRouteLayers();

  const allPathLatLngs = [];

  for (let sIdx = 0; sIdx < data.segments.length; sIdx++) {
    const seg = data.segments[sIdx];

    // Lấy hình học đường cong thực tế bám sát từng khúc cua của Google Maps
    const segLatLngs = await fetchRealRoadGeometry(seg.stations);
    segLatLngs.forEach(ll => allPathLatLngs.push(ll));

    // Lớp viền phát sáng nền (Glow border)
    const glowLine = L.polyline(segLatLngs, {
      color: '#FFFFFF',
      weight: 10,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Lớp line chính của tuyến
    const line = L.polyline(segLatLngs, {
      color: seg.color || '#059669',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    currentRouteLayers.push(glowLine);
    currentRouteLayers.push(line);

    // Tạo mục Timeline
    const stepEl = document.createElement('div');
    stepEl.className = 'timeline-step' + (sIdx === 0 ? ' active' : '');
    stepEl.id = `timelineStep_${sIdx}`;

    const isFirst = sIdx === 0;
    const isLast = sIdx === data.segments.length - 1;

    let markerClass = 'step-marker';
    if (isFirst) markerClass += ' start active-pulse';
    else markerClass += ' transfer';

    const liveTagHtml = isFirst ? `<span class="current-location-tag" id="currentLocationTag"><i class="fa-solid fa-location-dot"></i> ĐANG Ở ĐÂY</span>` : '';

    stepEl.innerHTML = `
      <div class="${markerClass}"></div>
      <div class="step-content">
        <div class="step-title">
          <span>${seg.start_station.name}</span>
          ${liveTagHtml}
        </div>
        <span class="bus-badge" style="background-color: ${seg.color || '#059669'};">
          <i class="fa-solid fa-bus"></i> ${seg.route_name}
        </span>
        <div class="step-desc">
          Đi qua <strong>${seg.stations.length - 1} trạm</strong> (~${seg.total_time} phút &bull; ${seg.total_distance.toFixed(1)} km)
        </div>
        <div class="step-live-status text-muted small" style="margin-top: 4px; font-style: italic;">
          ${isFirst 
            ? `<i class="fa-solid fa-clock"></i> Đang chờ xe cập bến (khoảng ${remainingSeconds} giây)...` 
            : `<i class="fa-solid fa-hourglass-start"></i> Chưa đến lượt &bull; Đang chờ xe hoàn thành chặng trước...`}
        </div>
        ${!isLast ? `
          <div class="transfer-box">
            <i class="fa-solid fa-person-walking-arrow-right"></i> Xuống tại <strong>${seg.end_station.name}</strong> &bull; Chờ xe tiếp theo (~8 phút)
          </div>
        ` : ''}
      </div>
    `;
    timeline.appendChild(stepEl);

    // Thêm điểm kết thúc cuối cùng
    if (isLast) {
      const finalStep = document.createElement('div');
      finalStep.className = 'timeline-step';
      finalStep.id = 'finalDestinationStep';
      finalStep.innerHTML = `
        <div class="step-marker end"></div>
        <div class="step-content">
          <div class="step-title">${seg.end_station.name}</div>
          <div class="step-desc" id="finalDestinationStatus">
            <i class="fa-solid fa-location-crosshairs text-muted"></i> Điểm đến dự kiến (Xe đang di chuyển...)
          </div>
        </div>
      `;
      timeline.appendChild(finalStep);
    }
  }

  // Fit bản đồ theo toàn bộ lộ trình
  if (allPathLatLngs.length > 0) {
    map.fitBounds(L.latLngBounds(allPathLatLngs), { padding: [50, 50] });

    // KÍCH HOẠT XE BUÝT CHẠY TIẾP CẬN VÀ LĂN BÁNH THEO LỘ TRÌNH ĐÃ ĐỒNG BỘ THỜI GIAN
    startJourneyBusOnNeo4jPath(allPathLatLngs, data, remainingSeconds, alertContainerId, firstRouteCode, routeIntervalMins);
  }
}

// Hàm tính khoảng cách giữa 2 tọa độ GPS (km) theo công thức Haversine
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 999;
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Biến quản lý xe buýt chạy trên lộ trình Neo4j vừa tìm
let journeyBusMarker = null;
let journeyBusTimeout = null;

function startJourneyBusOnNeo4jPath(pathPoints, data, initialSeconds, alertContainerId, routeCode, routeIntervalMins) {
  if (journeyBusTimeout) {
    clearTimeout(journeyBusTimeout);
    journeyBusTimeout = null;
  }
  if (journeyBusMarker) {
    map.removeLayer(journeyBusMarker);
    journeyBusMarker = null;
  }

  if (!pathPoints || pathPoints.length < 2) return;

  const startCoord = pathPoints[0];
  const secondCoord = pathPoints[1];
  const startName = data.stations[0].name;
  const endName = data.stations[data.stations.length - 1].name;

  // Lấy toàn bộ các trạm trên lộ trình và các trạm nằm trên trục đường xe chạy qua
  const allEnrouteStations = [];
  const addedIds = new Set();
  (data.stations || []).forEach(st => {
    if (!addedIds.has(st.id)) {
      allEnrouteStations.push(st);
      addedIds.add(st.id);
    }
  });
  if (Array.isArray(allStations)) {
    allStations.forEach(st => {
      if (!addedIds.has(st.id)) {
        // Kiểm tra xem trạm có nằm gần tuyến đường pathPoints không (dưới 100m)
        const isNearRoute = pathPoints.some((pt, idx) => {
          if (idx % 6 !== 0) return false; // kiểm tra nhanh mẫu điểm
          return calculateDistanceKm(pt[0], pt[1], st.lat, st.lng) < 0.1;
        });
        if (isNearRoute) {
          allEnrouteStations.push(st);
          addedIds.add(st.id);
        }
      }
    });
  }
  const intermediateStations = allEnrouteStations;

  // Tạo vector hướng tiếp cận trạm xuất phát (~300m trước trạm dọc theo tuyến)
  const dLat = startCoord[0] - secondCoord[0];
  const dLng = startCoord[1] - secondCoord[1];
  const norm = Math.hypot(dLat, dLng) || 0.001;
  const offsetDistance = 0.0028; // khoảng 280-300m
  const approachStart = [
    startCoord[0] + (dLat / norm) * offsetDistance,
    startCoord[1] + (dLng / norm) * offsetDistance
  ];

  // Tạo các điểm nội suy để xe chạy tới trạm xuất phát
  const approachSteps = Math.max(12, initialSeconds * 3);
  const approachPoints = [];
  for (let i = 0; i <= approachSteps; i++) {
    const ratio = i / approachSteps;
    approachPoints.push([
      approachStart[0] + (startCoord[0] - approachStart[0]) * ratio,
      approachStart[1] + (startCoord[1] - approachStart[1]) * ratio
    ]);
  }

  const journeyIcon = L.divIcon({
    className: 'journey-bus-icon',
    html: `
      <div class="live-bus-marker" style="border-color:#10B981; color:#059669; transform: scale(1.2); box-shadow: 0 0 16px #10B981;">
        <i class="fa-solid fa-bus-simple" style="font-size:15px;"></i>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  // Đặt xe tại điểm tiếp cận ban đầu
  journeyBusMarker = L.marker(approachPoints[0], { icon: journeyIcon }).addTo(map);

  journeyBusMarker.bindPopup(`
    <div style="font-size:0.88rem; padding:4px;">
      <h4 style="color:#059669; font-weight:800; margin-bottom:4px;">
        <i class="fa-solid fa-bus"></i> Tuyến ${routeCode} đang tới trạm
      </h4>
      <p><strong>Điểm đón:</strong> ${startName}</p>
      <p style="color:#D97706; font-weight:700;"><i class="fa-solid fa-hourglass-half"></i> Đang di chuyển tới bến...</p>
    </div>
  `).openPopup();

  let remainingSec = initialSeconds;
  let approachIdx = 0;

  // Cập nhật bộ đếm lùi thời gian thực mỗi giây
  etaCountdownInterval = setInterval(() => {
    remainingSec--;
    const displayEl = document.getElementById('etaCountdownDisplay');
    const firstStatusEl = document.querySelector('#timelineStep_0 .step-live-status');

    if (remainingSec > 0) {
      if (displayEl) {
        displayEl.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Xe sẽ cập bến sau: <strong>${remainingSec} giây</strong>`;
      }
      if (firstStatusEl) {
        firstStatusEl.innerHTML = `<span style="color:#D97706; font-weight:600;"><i class="fa-solid fa-clock"></i> Đang chờ xe cập bến (~${remainingSec} giây)...</span>`;
      }
    } else if (remainingSec === 0) {
      // ĐÚNG SỐ THỜI GIAN ĐÓ XE ĐÃ TỚI TRẠM!
      const alertBox = document.getElementById(alertContainerId);
      if (alertBox) {
        alertBox.className = 'realtime-alert-card arrived';
        alertBox.removeAttribute('style');
        alertBox.style.cursor = 'pointer';
        alertBox.innerHTML = `
          <div class="alert-icon arrived"><i class="fa-solid fa-door-open"></i></div>
          <div class="alert-text">
            <div class="alert-header-row">
              <span class="live-pulse-badge success"><i class="fa-solid fa-circle-check"></i> ĐÃ CẬP BẾN</span>
              <span class="alert-click-hint"><i class="fa-solid fa-location-crosshairs"></i> Xem trên bản đồ</span>
            </div>
            <div class="alert-title">Xe buýt đã đến trạm đón khách</div>
            <p class="alert-sub">Tuyến <b>${routeCode}</b> đã cập bến <strong>${startName}</strong>. Xin mời lên xe!</p>
            <div class="countdown-badge success">
              <i class="fa-solid fa-door-open"></i> Đang mở cửa đón khách...
            </div>
          </div>
        `;
      }
      if (firstStatusEl) {
        firstStatusEl.innerHTML = `<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-door-open"></i> Xe buýt đã tới trạm - Xin mời lên xe!</span>`;
      }
    } else if (remainingSec <= -4) {
      // Khi xe đón khách xong và lăn bánh: cập nhật thông báo
      const alertBox = document.getElementById(alertContainerId);
      if (alertBox) {
        const intervalNum = typeof routeIntervalMins === 'number' ? routeIntervalMins : (parseInt(routeIntervalMins) || 10);
        alertBox.className = 'realtime-alert-card in-transit';
        alertBox.removeAttribute('style');
        alertBox.style.cursor = 'pointer';
        alertBox.innerHTML = `
          <div class="alert-icon in-transit"><i class="fa-solid fa-route"></i></div>
          <div class="alert-text">
            <div class="alert-header-row">
              <span class="live-pulse-badge in-transit"><i class="fa-solid fa-bus"></i> ĐANG TRÊN LỘ TRÌNH</span>
              <span class="alert-click-hint"><i class="fa-solid fa-location-crosshairs"></i> Xem trên bản đồ</span>
            </div>
            <div class="alert-title">Chuyến xe đang lăn bánh</div>
            <p class="alert-sub">Tuyến <b>${routeCode}</b> đang di chuyển về hướng <strong>${endName}</strong></p>
            <div class="countdown-badge in-transit">
              <i class="fa-solid fa-gauge-high"></i> Tốc độ ổn định &bull; Chuyến sau sau ~${intervalNum}p
            </div>
          </div>
        `;
      }
      clearInterval(etaCountdownInterval);
      etaCountdownInterval = null;
    }
  }, 1000);

  // Giai đoạn 1: Xe chạy tiến dần từ approachStart về đến trạm xuất phát pathPoints[0]
  const approachIntervalMs = Math.round((initialSeconds * 1000) / approachSteps);

  function stepApproach() {
    approachIdx++;
    if (approachIdx < approachPoints.length) {
      journeyBusMarker.setLatLng(approachPoints[approachIdx]);
      journeyBusTimeout = setTimeout(stepApproach, approachIntervalMs);
    } else {
      // Xe đã đến đúng trạm xuất phát!
      journeyBusMarker.setLatLng(startCoord);
      journeyBusMarker.bindPopup(`
        <div style="font-size:0.88rem; padding:4px;">
          <h4 style="color:#10B981; font-weight:800; margin-bottom:4px;">
            <i class="fa-solid fa-door-open"></i> XE ĐÃ TỚI TRẠM XUẤT PHÁT
          </h4>
          <p><strong>Trạm:</strong> ${startName}</p>
          <p style="color:#059669; font-weight:700;"><i class="fa-solid fa-users"></i> Đang mở cửa đón khách (dừng 3.5s)...</p>
        </div>
      `).openPopup();

      // Dừng 3.5 giây tại trạm xuất phát để đón khách, sau đó mới lăn bánh theo hành trình!
      journeyBusTimeout = setTimeout(startMainRouteJourney, 3500);
    }
  }

  // Khởi động di chuyển tiếp cận ngay lập tức
  journeyBusTimeout = setTimeout(stepApproach, 300);

  // Giai đoạn 2: Xe lăn bánh trên toàn bộ tuyến đường Neo4j
  function startMainRouteJourney() {
    let pointIdx = 0;
    const total = pathPoints.length;
    const visitedStationIds = new Set();
    if (data.stations && data.stations.length > 0) {
      visitedStationIds.add(data.stations[0].id); // Không dừng lặp tại điểm xuất phát
    }

    // Cập nhật trạng thái chặng đầu tiên trong hướng dẫn
    const firstStatusEl = document.querySelector('#timelineStep_0 .step-live-status');
    if (firstStatusEl) {
      firstStatusEl.innerHTML = `<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-bus"></i> Xe đang di chuyển trên chặng này...</span>`;
    }

    journeyBusMarker.bindPopup(`
      <div style="font-size:0.88rem; padding:4px;">
        <h4 style="color:#059669; font-weight:800; margin-bottom:4px;">
          <i class="fa-solid fa-route"></i> Xe đang chạy theo lộ trình Neo4j
        </h4>
        <p><strong>Khởi hành:</strong> ${startName}</p>
        <p><strong>Đích đến:</strong> ${endName}</p>
        <p style="color:#059669; font-weight:700;"><i class="fa-solid fa-play"></i> Bắt đầu di chuyển...</p>
      </div>
    `).openPopup();

    function stepMove() {
      try {
        pointIdx++;

        // KHI XE BUÝT ĐẾN ĐÍCH CUỐI CÙNG -> CẬP NHẬT TRẠNG THÁI HOÀN THÀNH
        if (pointIdx >= total) {
          journeyBusMarker.setLatLng(pathPoints[total - 1]);
          journeyBusMarker.bindPopup(`
            <div style="font-size:0.88rem; padding:4px;">
              <h4 style="color:#10B981; font-weight:800; margin-bottom:4px;">
                <i class="fa-solid fa-flag-checkered"></i> ĐÃ ĐẾN TRẠM ĐÍCH!
              </h4>
              <p>Hành trình từ <strong>${startName}</strong> đến <strong>${endName}</strong> đã hoàn thành trọn vẹn theo thuật toán Neo4j.</p>
            </div>
          `).openPopup();

          // CẬP NHẬT TRẠNG THÁI TRÊN KHUNG HƯỚNG DẪN HÀNH TRÌNH BÊN TRÁI
          const finalStep = document.getElementById('finalDestinationStep');
          const finalStatus = document.getElementById('finalDestinationStatus');
          if (finalStep) {
            finalStep.classList.add('arrived', 'active');
            const finalMarker = finalStep.querySelector('.step-marker');
            if (finalMarker) finalMarker.classList.add('active-pulse');
          }
          const oldTag = document.getElementById('currentLocationTag');
          if (oldTag) oldTag.remove();
          if (finalStep) {
            const titleEl = finalStep.querySelector('.step-title');
            if (titleEl) {
              titleEl.insertAdjacentHTML('beforeend', `<span class="current-location-tag" id="currentLocationTag" style="background:#10B981;"><i class="fa-solid fa-flag-checkered"></i> ĐÃ ĐẾN NƠI</span>`);
            }
          }
          if (finalStatus) {
            finalStatus.innerHTML = `
              <div class="badge-arrived-success">
                <i class="fa-solid fa-circle-check"></i> ĐÃ ĐẾN NƠI THÀNH CÔNG!
              </div>
              <div style="color:#047857; font-size:0.8rem; margin-top:4px; font-weight:600;">
                Bạn đã hoàn thành chuyến đi an toàn tại <b>${endName}</b>.
              </div>
            `;
          }

          // Đánh dấu tất cả các chặng trước đã hoàn thành
          document.querySelectorAll('.timeline-step:not(#finalDestinationStep)').forEach(el => {
            el.classList.remove('active');
            el.classList.add('completed');
            const m = el.querySelector('.step-marker');
            if (m) m.classList.remove('active-pulse');
          });
          document.querySelectorAll('.step-live-status').forEach(el => {
            el.innerHTML = `<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-check"></i> Đã hoàn thành chặng</span>`;
          });

          return;
        }

        const currentPos = pathPoints[pointIdx];
        journeyBusMarker.setLatLng(currentPos);

        // Kiểm tra xem xe có chạm vào một trạm dừng MỚI chưa ghé không
        let newlyReachedStation = null;
        for (const st of intermediateStations) {
          if (!visitedStationIds.has(st.id) && st.name !== endName && st.name !== startName) {
            const d = calculateDistanceKm(currentPos[0], currentPos[1], st.lat, st.lng);
            if (d < 0.12) { // Bán kính 120m đảm bảo xe bắt trúng mọi trạm xe chạy qua
              newlyReachedStation = st;
              visitedStationIds.add(st.id); // Chỉ dừng 1 lần duy nhất mỗi trạm
              break;
            }
          }
        }

        if (newlyReachedStation) {
          // Cập nhật trạng thái timeline an toàn khi chuyển sang chặng tiếp theo
          if (data.segments && data.segments.length > 1) {
            for (let s = 0; s < data.segments.length; s++) {
              const seg = data.segments[s];
              if (seg.start_station.id === newlyReachedStation.id) {
                // Đánh dấu chặng trước đã hoàn thành
                if (s > 0) {
                  const prevStep = document.getElementById(`timelineStep_${s - 1}`);
                  if (prevStep) {
                    prevStep.classList.remove('active');
                    prevStep.classList.add('completed');
                    const prevMarker = prevStep.querySelector('.step-marker');
                    if (prevMarker) prevMarker.classList.remove('active-pulse');
                    const prevStatusEl = prevStep.querySelector('.step-live-status');
                    if (prevStatusEl) {
                      prevStatusEl.innerHTML = `<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-check"></i> Đã hoàn thành chặng</span>`;
                    }
                  }
                }

                // Di chuyển thẻ ĐANG Ở ĐÂY và hiệu ứng active sang chặng hiện tại
                const currentStep = document.getElementById(`timelineStep_${s}`);
                if (currentStep) {
                  currentStep.classList.add('active');
                  const currentMarker = currentStep.querySelector('.step-marker');
                  if (currentMarker) currentMarker.classList.add('active-pulse');

                  // Di chuyển tag ĐANG Ở ĐÂY
                  const oldTag = document.getElementById('currentLocationTag');
                  if (oldTag) oldTag.remove();
                  const titleEl = currentStep.querySelector('.step-title');
                  if (titleEl) {
                    titleEl.insertAdjacentHTML('beforeend', `<span class="current-location-tag" id="currentLocationTag"><i class="fa-solid fa-location-dot"></i> ĐANG Ở ĐÂY</span>`);
                  }

                  const currentStatusEl = currentStep.querySelector('.step-live-status');
                  if (currentStatusEl) {
                    currentStatusEl.innerHTML = `<span style="color:#059669; font-weight:700;"><i class="fa-solid fa-bus"></i> Xe đang di chuyển trên chặng này...</span>`;
                  }
                }
              }
            }
          }

          // DỪNG LẠI ĐÓN KHÁCH 2.5 GIÂY TẠI TRẠM DỌC ĐƯỜNG
          journeyBusMarker.bindPopup(`
            <div style="font-size:0.88rem; padding:4px;">
              <h4 style="color:#D97706; font-weight:800; margin-bottom:4px;">
                <i class="fa-solid fa-person-shelter"></i> DỪNG ĐÓN KHÁCH TẠI TRẠM
              </h4>
              <p><strong>Trạm:</strong> ${newlyReachedStation.name}</p>
              <p style="color:#B45309; font-weight:700;"><i class="fa-solid fa-door-open"></i> Đang mở cửa đón/trả khách...</p>
            </div>
          `).openPopup();

          journeyBusTimeout = setTimeout(stepMove, 2500); // Tạm dừng 2.5s rồi lăn bánh tiếp
        } else {
          // Xe di chuyển từ tốn, quan sát rõ từng con đường (240ms mỗi bước)
          journeyBusTimeout = setTimeout(stepMove, 240);
        }
      } catch (stepErr) {
        console.error('Loi trong qua trinh xe chay:', stepErr);
        // Bảo đảm xe không bị treo dù có lỗi DOM
        journeyBusTimeout = setTimeout(stepMove, 250);
      }
    }

    // Bắt đầu lăn bánh theo lộ trình chính
    journeyBusTimeout = setTimeout(stepMove, 600);
  }
}

// Xóa các đường vẽ cũ
function clearRouteLayers() {
  if (etaCountdownInterval) {
    clearInterval(etaCountdownInterval);
    etaCountdownInterval = null;
  }
  if (journeyBusTimeout) {
    clearTimeout(journeyBusTimeout);
    journeyBusTimeout = null;
  }
  if (journeyBusMarker) {
    map.removeLayer(journeyBusMarker);
    journeyBusMarker = null;
  }
  currentRouteLayers.forEach(l => map.removeLayer(l));
  currentRouteLayers = [];
}

// 9. GIẢ LẬP XE BUÝT CHẠY THỜI GIAN THỰC (BÁM SÁT 100% LÒNG ĐƯỜNG, DỪNG ĐÓN KHÁCH, CHẠY LIÊN TỤC)
const SIM_ROUTES_CONFIG = [
  {
    code: '19',
    name: 'Tuyến 19: Bến Thành - ĐHQG',
    color: '#059669',
    waypoints: '106.6980,10.7725;106.7112,10.8016;106.7235,10.7995;106.7725,10.8479;106.8005,10.8735'
  },
  {
    code: '01',
    name: 'Tuyến 01: Bến Thành - Chợ Lớn',
    color: '#DC2626',
    waypoints: '106.6980,10.7725;106.6690,10.7562;106.6534,10.7512'
  },
  {
    code: '08',
    name: 'Tuyến 08: Hàng Xanh - ĐH Sư Phạm Kỹ Thuật',
    color: '#2563EB',
    waypoints: '106.7112,10.8016;106.7118,10.8142;106.7200,10.8280;106.7719,10.8507'
  }
];

let activeSimBuses = [];
let simAnimationFrame = null;

async function startLiveBusSimulation() {
  // Chỉ khởi tạo 1 lần duy nhất để xe buýt luôn luôn tồn tại trên bản đồ
  if (activeSimBuses.length > 0) return;

  for (let i = 0; i < SIM_ROUTES_CONFIG.length; i++) {
    const r = SIM_ROUTES_CONFIG[i];

    try {
      const res = await fetch(`/api/road-route?points=${r.waypoints}`);
      const data = await res.json();

      if (data.coordinates && data.coordinates.length > 10) {
        const roadPoints = data.coordinates;

        const busIcon = L.divIcon({
          className: 'custom-bus-live-icon',
          html: `
            <div class="live-bus-marker" style="border-color:${r.color}; color:${r.color};">
              <i class="fa-solid fa-bus" style="font-size:13px;"></i>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        // Mỗi xe xuất phát so le nhau trên tuyến
        const startPointIndex = Math.floor((i * 0.3) * roadPoints.length) % roadPoints.length;
        const marker = L.marker(roadPoints[startPointIndex], { icon: busIcon }).addTo(map);

        activeSimBuses.push({
          code: r.code,
          name: r.name,
          color: r.color,
          roadPoints: roadPoints,
          marker: marker,
          currentIndex: startPointIndex,
          direction: 1,
          isWaitingAtStop: false,
          waitCounter: 0
        });
      }
    } catch (e) {
      console.warn('Lỗi nạp geometry xe buýt:', e);
    }
  }

  // Vòng lặp di chuyển xe buýt: Chạy chậm rãi, dừng đỗ tại trạm, chạy mãi mãi
  let lastMoveTime = Date.now();

  function animateBuses() {
    if (!isSimulationActive) {
      simAnimationFrame = requestAnimationFrame(animateBuses);
      return;
    }

    const now = Date.now();
    // Di chuyển mỗi 420ms (Tốc độ thư thả, quan sát xe chạy chân thực trên phố)
    if (now - lastMoveTime > 420) {
      lastMoveTime = now;

      activeSimBuses.forEach(bus => {
        const points = bus.roadPoints;
        const total = points.length;

        // Nếu xe đang trong trạng thái dừng đón khách tại trạm
        if (bus.isWaitingAtStop) {
          bus.waitCounter--;
          if (bus.waitCounter <= 0) {
            bus.isWaitingAtStop = false; // Hết giờ dừng, xe lăn bánh tiếp
          } else {
            bus.marker.bindPopup(`
              <div style="font-size: 0.88rem; padding: 4px; min-width: 180px;">
                <h4 style="color:${bus.color}; margin-bottom:4px; font-weight:800;">
                  <i class="fa-solid fa-bus"></i> ${bus.name}
                </h4>
                <p><strong>Mã xe:</strong> BUS_${bus.code}_LIVE</p>
                <p style="color:#D97706; font-weight:800;">
                  <i class="fa-solid fa-person-shelter"></i> Đang dừng đón/trả khách...
                </p>
                <p class="small text-muted">Sắp xuất bến sau ~${Math.ceil(bus.waitCounter * 0.28)}s</p>
              </div>
            `);
            return; // Đang dừng đỗ thì giữ nguyên vị trí
          }
        }

        // Tiến thêm 1 điểm trên lòng đường thật
        bus.currentIndex += bus.direction;

        // Cứ sau mỗi ~25-30 điểm (khoảng 1 trạm dừng ngoài đời), hoặc khi tới đầu/cuối bến: xe dừng lại đón khách
        const isTerminal = (bus.currentIndex >= total - 1) || (bus.currentIndex <= 0);
        const isIntermediateStop = (bus.currentIndex % 28 === 0);

        if (isTerminal || isIntermediateStop) {
          bus.isWaitingAtStop = true;
          bus.waitCounter = isTerminal ? 12 : 8; // Đầu bến dừng ~3.5s, trạm dọc đường dừng ~2.2s
        }

        // Đổi hướng khi tới cuối bến để quay đầu chạy ngược lại trên cùng tuyến đường
        if (bus.currentIndex >= total - 1) {
          bus.currentIndex = total - 1;
          bus.direction = -1;
        } else if (bus.currentIndex <= 0) {
          bus.currentIndex = 0;
          bus.direction = 1;
        }

        const currentPos = points[bus.currentIndex];
        if (currentPos) {
          bus.marker.setLatLng(currentPos);

          bus.marker.bindPopup(`
            <div style="font-size: 0.88rem; padding: 4px; min-width: 180px;">
              <h4 style="color:${bus.color}; margin-bottom:4px; font-weight:800;">
                <i class="fa-solid fa-bus"></i> ${bus.name}
              </h4>
              <p><strong>Mã xe:</strong> BUS_${bus.code}_LIVE</p>
              <p><strong>Trạng thái:</strong> <span class="text-success font-weight-bold">Đang di chuyển trên tuyến</span></p>
              <p style="color:#059669; font-weight:800; margin-top:4px;">
                <i class="fa-solid fa-gauge-high"></i> Vận tốc: 30 km/h
              </p>
            </div>
          `);
        }
      });
    }

    simAnimationFrame = requestAnimationFrame(animateBuses);
  }

  animateBuses();
}

function clearLiveBuses() {
  if (simAnimationFrame) {
    cancelAnimationFrame(simAnimationFrame);
    simAnimationFrame = null;
  }
  // Giữ nguyên các xe buýt để xe luôn luôn ở đó chạy mãi
}

// ==============================================================================
// TÍNH NĂNG 1: TÌM TRẠM DỪNG GẦN TÔI NHẤT (GPS & SPATIAL GEOLOCATION)
// ==============================================================================
let userLocationMarker = null;

function initNearMeFeature() {
  const btnNearMe = document.getElementById('btnFindNearestStation');
  const btnClose = document.getElementById('btnCloseNearMeModal');

  if (btnNearMe) {
    btnNearMe.addEventListener('click', openNearMeModal);
  }
  if (btnClose) {
    btnClose.addEventListener('click', closeNearMeModal);
  }
}

function openNearMeModal() {
  const modal = document.getElementById('nearMeModal');
  if (modal) modal.classList.add('show');

  const loading = document.getElementById('nearMeLoading');
  const list = document.getElementById('nearestStationsList');
  if (loading) loading.style.display = 'block';
  if (list) list.innerHTML = '';

  // Thử lấy vị trí GPS thực tế của người dùng
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        executeFetchNearest(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        // Fallback tọa độ trung tâm thuận tiện gần ĐH SPKT (Thủ Đức)
        console.warn('GPS không khả dụng hoặc bị từ chối, dùng vị trí mô phỏng Thủ Đức:', err.message);
        executeFetchNearest(10.8507, 106.7719, true);
      },
      { timeout: 5000 }
    );
  } else {
    executeFetchNearest(10.8507, 106.7719, true);
  }
}

function closeNearMeModal() {
  const modal = document.getElementById('nearMeModal');
  if (modal) modal.classList.remove('show');
}

async function executeFetchNearest(lat, lng, isFallback = false) {
  const loading = document.getElementById('nearMeLoading');
  const list = document.getElementById('nearestStationsList');

  try {
    const res = await fetch(`/api/stations/nearest?lat=${lat}&lng=${lng}&limit=4`);
    const data = await res.json();

    if (loading) loading.style.display = 'none';

    if (!data.nearest_stations || data.nearest_stations.length === 0) {
      if (list) list.innerHTML = '<p class="text-muted text-center p-3">Không tìm thấy trạm xe buýt nào quanh tọa độ này.</p>';
      return;
    }

    // Hiển thị marker vị trí người dùng trên bản đồ
    if (userLocationMarker) {
      map.removeLayer(userLocationMarker);
    }
    const userIcon = L.divIcon({
      className: 'user-gps-marker',
      html: '<div class="user-pulse-circle"><i class="fa-solid fa-person-walking"></i></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    userLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
    userLocationMarker.bindPopup('<b>Vị trí của bạn</b><br>' + (isFallback ? '(Vị trí mô phỏng: ĐH SPKT Thủ Đức)' : '(GPS thực tế)')).openPopup();
    map.setView([lat, lng], 15);

    let html = '';
    if (isFallback) {
      html += `
        <div class="alert-box-notice">
          <i class="fa-solid fa-circle-info"></i> Đang hiển thị trạm quanh khu vực <strong>ĐH Sư Phạm Kỹ Thuật (Hub Thủ Đức)</strong>.
        </div>
      `;
    }

    data.nearest_stations.forEach((st) => {
      const routesHtml = (st.routes || []).map(r => `
        <span class="route-pill" style="background:${r.color || '#059669'};">
          ${r.code}
        </span>
      `).join('');

      html += `
        <div class="nearest-station-card">
          <div class="nearest-card-left">
            <div class="distance-chip">
              <span class="dist-num">${st.distance_meters}m</span>
              <span class="walk-time">~${st.walking_time_mins}p đi bộ</span>
            </div>
            <div class="nearest-info">
              <div class="station-name">${st.name}</div>
              <div class="station-zone"><i class="fa-solid fa-map-pin"></i> ${st.zone || 'TP.HCM'}</div>
              <div class="serving-routes-row">
                <span class="label-routes">Tuyến đi qua:</span>
                ${routesHtml || '<small class="text-muted">Đang cập nhật</small>'}
              </div>
            </div>
          </div>
          <button class="btn btn-select-nearest" onclick="selectAsStartStation('${st.id}', ${st.lat}, ${st.lng})">
            <i class="fa-solid fa-check"></i> Chọn trạm này
          </button>
        </div>
      `;
    });

    if (list) list.innerHTML = html;

  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (list) list.innerHTML = `<p class="text-danger text-center p-3">Lỗi tải dữ liệu: ${err.message}</p>`;
  }
}

// Hàm chọn trạm gần nhất làm Điểm xuất phát (A)
window.selectAsStartStation = function(stationId, lat, lng) {
  const select = document.getElementById('startStationSelect');
  if (select) {
    select.value = stationId;
  }
  closeNearMeModal();

  // Bay bản đồ tới trạm và mở popup
  map.flyTo([lat, lng], 16, { animate: true, duration: 1 });
  if (stationMarkers.has(stationId)) {
    stationMarkers.get(stationId).openPopup();
  }
};

// ==============================================================================
// TÍNH NĂNG 2: PHÂN TÍCH MẠNG LƯỚI ĐỒ THỊ NEO4J (GRAPH ANALYTICS & CENTRALITY)
// ==============================================================================
function initGraphAnalyticsFeature() {
  const btnAnalytics = document.getElementById('btnOpenAnalytics');
  const btnClose = document.getElementById('btnCloseAnalyticsModal');

  if (btnAnalytics) {
    btnAnalytics.addEventListener('click', openAnalyticsModal);
  }
  if (btnClose) {
    btnClose.addEventListener('click', closeAnalyticsModal);
  }
}

function openAnalyticsModal() {
  const modal = document.getElementById('graphAnalyticsModal');
  if (modal) modal.classList.add('show');
  loadGraphAnalyticsData();
}

function closeAnalyticsModal() {
  const modal = document.getElementById('graphAnalyticsModal');
  if (modal) modal.classList.remove('show');
}

async function loadGraphAnalyticsData() {
  const content = document.getElementById('analyticsModalContent');
  if (!content) return;

  content.innerHTML = `
    <div style="text-align: center; padding: 30px;">
      <i class="fa-solid fa-spinner fa-spin text-primary fa-2x"></i>
      <p class="mt-2 text-muted">Đang truy vấn độ phân nhánh và Degree Centrality từ Neo4j...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/graph/analytics');
    const data = await res.json();

    const summary = data.network_summary || {};
    const hubs = data.top_hubs || [];
    const routes = data.top_routes || [];
    const cyphers = data.cypher_templates || [];

    let hubsTableRows = hubs.map((h, i) => `
      <tr>
        <td class="text-center font-weight-bold">#${i + 1}</td>
        <td><strong>${h.name}</strong></td>
        <td><span class="badge-zone">${h.zone || 'TP.HCM'}</span></td>
        <td class="text-center"><span class="badge-count-routes">${h.route_count} tuyến</span></td>
        <td class="text-center"><strong class="text-primary">${h.connections}</strong></td>
      </tr>
    `).join('');

    let routesTableRows = routes.map((r, i) => `
      <tr>
        <td class="text-center font-weight-bold">#${i + 1}</td>
        <td>
          <span class="route-pill" style="background:${r.color};">${r.code}</span>
          <span class="ms-1 font-weight-bold">${r.name}</span>
        </td>
        <td class="text-center"><strong>${r.station_count} trạm</strong></td>
      </tr>
    `).join('');

    let cypherBoxesHtml = cyphers.map(c => `
      <div class="cypher-card-item">
        <div class="cypher-title"><i class="fa-solid fa-terminal"></i> ${c.title}</div>
        <pre class="cypher-pre"><code>${c.cypher}</code></pre>
      </div>
    `).join('');

    content.innerHTML = `
      <!-- 4 THẺ SỐ LIỆU ĐỊNH MỨC MẠNG LƯỚI -->
      <div class="analytics-metrics-grid">
        <div class="metric-card">
          <div class="metric-icon bg-emerald"><i class="fa-solid fa-map-pin"></i></div>
          <div class="metric-body">
            <span class="metric-label">Tổng trạm (:Station)</span>
            <span class="metric-value">${summary.total_stations || 65}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon bg-blue"><i class="fa-solid fa-bus"></i></div>
          <div class="metric-body">
            <span class="metric-label">Tuyến xe (:BusRoute)</span>
            <span class="metric-value">${summary.total_routes || 8}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon bg-orange"><i class="fa-solid fa-route"></i></div>
          <div class="metric-body">
            <span class="metric-label">Liên kết [:CONNECTS_TO]</span>
            <span class="metric-value">${summary.total_edges || 178}</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon bg-purple"><i class="fa-solid fa-share-nodes"></i></div>
          <div class="metric-body">
            <span class="metric-label">Bậc đồ thị trung bình</span>
            <span class="metric-value">${summary.avg_connections_per_station || 2.7}</span>
          </div>
        </div>
      </div>

      <div class="analytics-row mt-3">
        <!-- BẢNG 1: TOP TRẠM HUYẾT MẠCH (DEGREE CENTRALITY) -->
        <div class="analytics-col">
          <div class="analytics-panel">
            <h5><i class="fa-solid fa-crown text-warning"></i> Top Trạm Trung Chuyển Lớn Nhất (Degree Centrality)</h5>
            <p class="panel-sub">Trạm có nhiều tuyến giao cắt nhất - Vai trò cầu nối trong đồ thị</p>
            <table class="analytics-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Tên Trạm</th>
                  <th>Khu vực</th>
                  <th style="text-align: center;">Tuyến qua</th>
                  <th style="text-align: center;">Bậc (Degree)</th>
                </tr>
              </thead>
              <tbody>
                ${hubsTableRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- BẢNG 2: TUYẾN XE CÓ ĐỘ PHỦ RỘNG NHẤT -->
        <div class="analytics-col">
          <div class="analytics-panel">
            <h5><i class="fa-solid fa-network-wired text-primary"></i> Tuyến Xe Có Số Trạm Lớn Nhất</h5>
            <p class="panel-sub">Tuyến trục chính kết nối các quận trọng điểm</p>
            <table class="analytics-table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Tuyến Xe Buýt</th>
                  <th style="text-align: center;">Số trạm dừng</th>
                </tr>
              </thead>
              <tbody>
                ${routesTableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- CÁC CÂU LỆNH CYPHER MẪU ĐỂ BÁO CÁO -->
      <div class="analytics-panel mt-3">
        <h5><i class="fa-solid fa-code text-success"></i> Câu Truy Vấn Cypher Thực Tế (Dành Cho Báo Cáo Đồ Án)</h5>
        <p class="panel-sub">Có thể copy chạy trực tiếp trên Neo4j Browser để minh chứng kết quả</p>
        <div class="cypher-grid">
          ${cypherBoxesHtml}
        </div>
      </div>
    `;

  } catch (err) {
    content.innerHTML = `<p class="text-danger text-center p-3">Lỗi tải phân tích: ${err.message}</p>`;
  }
}
