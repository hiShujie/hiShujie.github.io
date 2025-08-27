// 访客地图可视化组件
class VisitorMap {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.markers = [];
    this.visitorData = null;
    this.init();
  }

  // 初始化地图
  async init() {
    try {
      // 动态加载 Leaflet CSS 和 JS
      await this.loadLeaflet();
      
      // 创建地图容器
      this.createMapContainer();
      
      // 初始化地图
      this.initMap();
      
      // 监听访客数据更新事件
      this.listenToDataUpdates();
      
      // 加载初始数据
      this.loadInitialData();
      
    } catch (error) {
      console.error('访客地图初始化失败:', error);
    }
  }

  // 加载 Leaflet 库
  async loadLeaflet() {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      if (window.L) {
        resolve();
        return;
      }

      // 加载 CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);

      // 加载 JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 创建地图容器
  createMapContainer() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`找不到容器: ${this.containerId}`);
      return;
    }

    // 清空容器
    container.innerHTML = '';
    
    // 添加地图容器
    const mapDiv = document.createElement('div');
    mapDiv.id = 'visitor-map';
    mapDiv.style.height = '500px';
    mapDiv.style.width = '100%';
    mapDiv.style.borderRadius = '8px';
    mapDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    container.appendChild(mapDiv);

    // 添加统计信息面板
    this.createStatsPanel(container);
  }

  // 创建统计信息面板
  createStatsPanel(container) {
    const statsPanel = document.createElement('div');
    statsPanel.className = 'visitor-stats-panel';
    statsPanel.style.cssText = `
      margin-top: 20px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;

    statsPanel.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">访客统计</h3>
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
        <div class="stat-item">
          <div class="stat-number" id="total-visitors">-</div>
          <div class="stat-label">总访客数</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" id="total-visits">-</div>
          <div class="stat-label">总访问量</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" id="unique-visitors">-</div>
          <div class="stat-label">独立访客</div>
        </div>
        <div class="stat-item">
          <div class="stat-number" id="countries-count">-</div>
          <div class="stat-label">国家数量</div>
        </div>
      </div>
      
      <div class="top-countries" style="margin-top: 20px;">
        <h4 style="color: #666;">热门国家/地区</h4>
        <div id="top-countries-list" style="display: flex; flex-wrap: wrap; gap: 10px;"></div>
      </div>
    `;

    container.appendChild(statsPanel);
  }

  // 初始化地图
  initMap() {
    const mapContainer = document.getElementById('visitor-map');
    if (!mapContainer) return;

    // 创建地图实例
    this.map = L.map('visitor-map').setView([35.8617, 104.1954], 4); // 中国中心

    // 添加地图图层
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);

    // 添加地图控件
    this.map.addControl(L.control.zoom());
    this.map.addControl(L.control.scale());
  }

  // 监听数据更新事件
  listenToDataUpdates() {
    window.addEventListener('visitorDataUpdated', (event) => {
      this.updateMap(event.detail);
    });
  }

  // 加载初始数据
  loadInitialData() {
    if (window.visitorAnalytics) {
      this.updateMap(window.visitorAnalytics.getVisitorData());
    }
  }

  // 更新地图
  updateMap(visitorData) {
    this.visitorData = visitorData;
    
    // 清除现有标记
    this.clearMarkers();
    
    // 添加访客标记
    this.addVisitorMarkers();
    
    // 更新统计信息
    this.updateStats();
    
    // 调整地图视图
    this.adjustMapView();
  }

  // 清除标记
  clearMarkers() {
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  // 添加访客标记
  addVisitorMarkers() {
    if (!this.visitorData?.visitors) return;

    const locationGroups = {};
    
    // 按位置分组访客
    this.visitorData.visitors.forEach(visitor => {
      if (visitor.geolocation?.latitude && visitor.geolocation?.longitude) {
        const key = `${visitor.geolocation.latitude},${visitor.geolocation.longitude}`;
        if (!locationGroups[key]) {
          locationGroups[key] = {
            location: visitor.geolocation,
            visitors: []
          };
        }
        locationGroups[key].visitors.push(visitor);
      }
    });

    // 为每个位置创建标记
    Object.values(locationGroups).forEach(group => {
      const marker = this.createVisitorMarker(group);
      this.markers.push(marker);
      marker.addTo(this.map);
    });
  }

  // 创建访客标记
  createVisitorMarker(group) {
    const { location, visitors } = group;
    const visitorCount = visitors.length;
    
    // 创建自定义图标
    const icon = L.divIcon({
      className: 'visitor-marker',
      html: `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          ${visitorCount}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // 创建标记
    const marker = L.marker([location.latitude, location.longitude], { icon });
    
    // 创建弹出信息
    const popupContent = this.createPopupContent(group);
    marker.bindPopup(popupContent);
    
    return marker;
  }

  // 创建弹出信息内容
  createPopupContent(group) {
    const { location, visitors } = group;
    const visitorCount = visitors.length;
    
    let content = `
      <div style="min-width: 200px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">
          📍 ${location.city || '未知城市'}, ${location.country || '未知国家'}
        </h4>
        <p style="margin: 5px 0; color: #666;">
          <strong>访客数量:</strong> ${visitorCount}
        </p>
        <p style="margin: 5px 0; color: #666;">
          <strong>坐标:</strong> ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}
        </p>
        <hr style="margin: 10px 0;">
        <h5 style="margin: 10px 0; color: #555;">最近访客:</h5>
        <div style="max-height: 150px; overflow-y: auto;">
    `;

    // 显示最近的访客信息
    const recentVisitors = visitors
      .sort((a, b) => new Date(b.lastVisit || b.timestamp) - new Date(a.firstVisit || a.timestamp))
      .slice(0, 5);

    recentVisitors.forEach(visitor => {
      const visitTime = new Date(visitor.lastVisit || visitor.timestamp).toLocaleString('zh-CN');
      content += `
        <div style="padding: 5px; background: #f8f9fa; margin: 2px 0; border-radius: 4px; font-size: 12px;">
          👤 ${visitTime} - ${visitor.geolocation?.timezone || '未知时区'}
        </div>
      `;
    });

    content += `
        </div>
      </div>
    `;

    return content;
  }

  // 更新统计信息
  updateStats() {
    if (!this.visitorData?.statistics) return;

    const stats = this.visitorData.statistics;
    
    // 更新数字统计
    document.getElementById('total-visitors').textContent = stats.uniqueVisitors || 0;
    document.getElementById('total-visits').textContent = stats.totalVisits || 0;
    document.getElementById('unique-visitors').textContent = stats.uniqueVisitors || 0;
    document.getElementById('countries-count').textContent = Object.keys(stats.countries || {}).length;

    // 更新热门国家列表
    this.updateTopCountries(stats.countries);
  }

  // 更新热门国家列表
  updateTopCountries(countries) {
    const container = document.getElementById('top-countries-list');
    if (!container || !countries) return;

    const sortedCountries = Object.entries(countries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    container.innerHTML = sortedCountries.map(([country, count]) => `
      <span style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
      ">
        ${country} (${count})
      </span>
    `).join('');
  }

  // 调整地图视图
  adjustMapView() {
    if (this.markers.length === 0) return;

    const group = new L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  // 获取地图实例
  getMap() {
    return this.map;
  }

  // 销毁地图
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
  }
}

// 导出类
window.VisitorMap = VisitorMap; 