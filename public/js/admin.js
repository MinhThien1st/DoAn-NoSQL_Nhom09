/**
 * [PHẦN JAVASCRIPT GIAO DIỆN ADMIN CỦA SINH VIÊN 1] - BẢN ĐÃ SỬA
 * Đặt vào file public/js/app.js để điều khiển các chức năng quản trị
 */

// 1. Tải danh sách trạm xe lên bảng Admin
async function loadAdminStations() {
  try {
    const res = await fetch('/api/stations');
    const data = await res.json();
    if (data.success && data.data) {
      const tbody = document.getElementById('adminStationsTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';
      data.data.forEach(st => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge bg-secondary">${st.id}</span></td>
          <td class="fw-semibold">${st.name}</td>
          <td><small class="text-muted">${st.lat != null ? Number(st.lat).toFixed(4) : '?'}, ${st.lng != null ? Number(st.lng).toFixed(4) : '?'}</small></td>
          <td>
            <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteStation('${st.id}')">
              <i class="bi bi-trash"></i> Xóa
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Lỗi tải danh sách trạm admin:', err);
  }
}

// 2. Thao tác xóa trạm xe
async function deleteStation(stationId) {
  if (!confirm(`Bạn có chắc chắn muốn xóa trạm [${stationId}] không?`)) return;
  try {
    const res = await fetch(`/api/stations/${stationId}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    loadAdminStations();
  } catch (err) {
    alert('Lỗi xóa trạm: ' + err.message);
  }
}

// 3. Đăng ký sự kiện Submit Form Thêm trạm & Form Cập nhật lịch trình
document.addEventListener('DOMContentLoaded', () => {
  // Thêm trạm mới
  const formAddStation = document.getElementById('formAddStation');
  if (formAddStation) {
    formAddStation.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        id: document.getElementById('newStationId').value.trim(),
        name: document.getElementById('newStationName').value.trim(),
        lat: parseFloat(document.getElementById('newStationLat').value),
        lng: parseFloat(document.getElementById('newStationLon').value)
      };
      try {
        const res = await fetch('/api/stations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
          formAddStation.reset();
          loadAdminStations();
        }
      } catch (err) {
        alert('Lỗi gửi yêu cầu: ' + err.message);
      }
    });
  }

  // Cập nhật lịch trình tuyến xe
  const formUpdateRoute = document.getElementById('formUpdateRouteSchedule');
  if (formUpdateRoute) {
    formUpdateRoute.addEventListener('submit', async (e) => {
      e.preventDefault();
      const routeId = document.getElementById('adminRouteSelect').value;
      if (!routeId) {
        alert('Vui lòng chọn tuyến xe cần sửa lịch trình!');
        return;
      }
      const payload = {
        startTime: document.getElementById('adminRouteStartTime').value || null,
        endTime: document.getElementById('adminRouteEndTime').value || null,
        interval: document.getElementById('adminRouteInterval').value || null,
        fare: document.getElementById('adminRouteFare').value || null
      };
      try {
        const res = await fetch(`/api/routes/${routeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
      } catch (err) {
        alert('Lỗi cập nhật lịch trình: ' + err.message);
      }
    });
  }

  // Nút làm mới
  const btnReload = document.getElementById('btnReloadStations');
  if (btnReload) btnReload.addEventListener('click', loadAdminStations);
});
