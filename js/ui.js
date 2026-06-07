/**
 * UI Module
 * Handles all DOM updates and user interface interactions
 */

const UIManager = (() => {
  const ICONS = {
    good: '🧑‍💻',
    slouch: '🫤',
    walking: '🚶',
    stand: '🧍',
    calibrating: '⏳'
  };

  const COLORS = {
    good: 'var(--green)',
    slouch: 'var(--amber)',
    walking: 'var(--blue)',
    stand: 'var(--text-dim)',
    calibrating: 'var(--text-muted)'
  };

  const LABELS = {
    good: 'Good Posture',
    slouch: 'Slouching',
    walking: 'Walking',
    stand: 'Standing',
    calibrating: 'Calibrating...'
  };

  /**
   * Update posture gauge display
   */
  function updatePostureGauge(label, conf, ax, ay, az) {
    try {
      const icon = ICONS[label] || '🧍';
      const color = COLORS[label] || 'var(--teal)';
      const labelText = LABELS[label] || label;

      document.getElementById('postureIcon').textContent = icon;
      document.getElementById('postureIcon').setAttribute('aria-label', labelText);

      const stateEl = document.getElementById('postureState');
      stateEl.textContent = labelText;
      stateEl.style.color = color;

      const confText = conf ? `Confidence: ${conf}%` : 'Confidence: —';
      document.getElementById('postureConf').textContent = confText;

      // Update sensor values with fixed precision
      document.getElementById('axVal').textContent = ax.toFixed(2);
      document.getElementById('ayVal').textContent = ay.toFixed(2);
      document.getElementById('azVal').textContent = az.toFixed(2);

      // Update gauge glow color
      const gauge = document.getElementById('postureGauge');
      const colorValue = color
        .replace('var(--', '')
        .replace(')', '');
      gauge.style.setProperty('--state-color', `var(--${colorValue}-dim)`);
    } catch (error) {
      console.error('Error updating posture gauge:', error);
    }
  }

  /**
   * Add entry to activity feed
   */
  function addFeedItem(text, dotColor = 'var(--teal)') {
    try {
      const feedList = document.getElementById('feedList');
      const item = document.createElement('div');
      item.className = 'feed-item';

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      item.innerHTML = `
        <div class="feed-dot" style="background:${dotColor}"></div>
        <div class="feed-text">${text}</div>
        <div class="feed-time">${timeStr}</div>
      `;

      feedList.insertBefore(item, feedList.firstChild);

      // Keep only last 10 items
      while (feedList.children.length > 10) {
        feedList.removeChild(feedList.lastChild);
      }
    } catch (error) {
      console.error('Error adding feed item:', error);
    }
  }

  /**
   * Show/hide loading overlay
   */
  function setLoading(isLoading) {
    const overlay = document.getElementById('loadingState');
    if (overlay) {
      overlay.style.display = isLoading ? 'flex' : 'none';
    }
  }

  /**
   * Show alert banner
   */
  function showAlert(message, duration = 5000) {
    try {
      const banner = document.getElementById('alertBanner');
      banner.textContent = message;
      banner.classList.add('show');

      setTimeout(() => {
        banner.classList.remove('show');
      }, duration);
    } catch (error) {
      console.error('Error showing alert:', error);
    }
  }

  /**
   * Update status dot
   */
  function setMonitoringActive(isActive) {
    const dot = document.getElementById('statusDot');
    if (isActive) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  }

  /**
   * Toggle permission card visibility
   */
  function showMonitoringContent(show = true) {
    const permCard = document.getElementById('permCard');
    const monitorContent = document.getElementById('monitorContent');

    if (show) {
      permCard.style.display = 'none';
      monitorContent.style.display = 'block';
    } else {
      permCard.style.display = 'block';
      monitorContent.style.display = 'none';
    }
  }

  /**
   * Update chart canvas with proper DPI scaling
   */
  function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    return { canvas, ctx, width: rect.width, height: rect.height };
  }

  /**
   * Draw signal chart
   */
  function drawSignalChart(data) {
    try {
      const chart = setupCanvas('signalChart');
      if (!chart) return;

      const { ctx, width, height } = chart;
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#1e2d47';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        const y = (i / 4) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw lines for each axis
      drawLine(ctx, data, 'ax', '#f87171', width, height);
      drawLine(ctx, data, 'ay', '#4ade80', width, height);
      drawLine(ctx, data, 'az', '#60a5fa', width, height);
    } catch (error) {
      console.error('Error drawing signal chart:', error);
    }
  }

  /**
   * Draw SMA history chart
   */
  function drawSMAChart(smaData) {
    try {
      const chart = setupCanvas('smaChart');
      if (!chart) return;

      const { ctx, width, height } = chart;
      ctx.clearRect(0, 0, width, height);

      if (smaData.length < 2) return;

      const minV = 0;
      const maxV = 3;
      ctx.strokeStyle = '#00d4b8';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < smaData.length; i++) {
        const x = (i / (smaData.length - 1)) * width;
        const val = Math.max(minV, Math.min(maxV, smaData[i]));
        const y = height - ((val - minV) / (maxV - minV)) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Fill area under curve
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.fillStyle = '#00d4b820';
      ctx.fill();
    } catch (error) {
      console.error('Error drawing SMA chart:', error);
    }
  }

  /**
   * Helper function to draw line on canvas
   */
  function drawLine(ctx, data, key, color, width, height) {
    if (data.length < 2) return;

    const minV = -20;
    const maxV = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const val = Math.max(minV, Math.min(maxV, data[i][key]));
      const y = height - ((val - minV) / (maxV - minV)) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  /**
   * Draw donut chart
   */
  function drawDonutChart(counts) {
    try {
      const canvas = document.getElementById('donutChart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const cx = 70;
      const cy = 70;
      const r = 52;
      const inner = 35;

      ctx.clearRect(0, 0, 140, 140);

      const total =
        counts.good + counts.slouch + counts.walk + counts.stand || 1;
      const slices = [
        { v: counts.good, color: '#4ade80' },
        { v: counts.slouch, color: '#fbbf24' },
        { v: counts.walk, color: '#60a5fa' },
        { v: counts.stand, color: '#64748b' }
      ];

      let angle = -Math.PI / 2;
      for (const s of slices) {
        const sweep = (s.v / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + sweep);
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        angle += sweep;
      }

      // Inner hole
      ctx.beginPath();
      ctx.arc(cx, cy, inner, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();
    } catch (error) {
      console.error('Error drawing donut chart:', error);
    }
  }

  /**
   * Show/hide tab content
   */
  function showTab(tabName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach((section) => {
      section.classList.remove('active');
    });

    // Remove active from tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });

    // Show selected section
    const selectedSection = document.getElementById(tabName);
    if (selectedSection) {
      selectedSection.classList.add('active');
    }

    // Mark selected tab as active
    const selectedTab = document.querySelector(
      `.tab[aria-controls="${tabName}"]`
    );
    if (selectedTab) {
      selectedTab.classList.add('active');
      selectedTab.setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Update history list
   */
  function updateHistoryList(sessions) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (sessions.length === 0) {
      historyList.innerHTML =
        '<div style="text-align:center; color:var(--text-muted); padding:40px 0; font-size:14px;">No sessions yet.<br>Start monitoring to record data.</div>';
      return;
    }

    sessions.forEach((session) => {
      const item = document.createElement('div');
      item.className = 'timeline-bar';
      item.innerHTML = `
        <div class="timeline-label">${new Date(session.timestamp).toLocaleDateString()}</div>
        <div style="font-size: 13px; color: var(--text-dim); margin-bottom: 8px;">
          Duration: ${Math.round(session.duration / 60)}m | Score: ${session.score}/100
        </div>
        <div class="bar-track">
          <div class="bar-seg" style="background:var(--green); width:${(session.counts.good / (session.counts.good + session.counts.slouch + session.counts.walk + session.counts.stand) * 100) || 0}%"></div>
          <div class="bar-seg" style="background:var(--amber); width:${(session.counts.slouch / (session.counts.good + session.counts.slouch + session.counts.walk + session.counts.stand) * 100) || 0}%"></div>
          <div class="bar-seg" style="background:var(--blue); width:${(session.counts.walk / (session.counts.good + session.counts.slouch + session.counts.walk + session.counts.stand) * 100) || 0}%"></div>
          <div class="bar-seg" style="background:var(--text-muted); width:${(session.counts.stand / (session.counts.good + session.counts.slouch + session.counts.walk + session.counts.stand) * 100) || 0}%"></div>
        </div>
      `;
      historyList.appendChild(item);
    });
  }

  return {
    updatePostureGauge,
    addFeedItem,
    setLoading,
    showAlert,
    setMonitoringActive,
    showMonitoringContent,
    drawSignalChart,
    drawSMAChart,
    drawDonutChart,
    showTab,
    updateHistoryList
  };
})();
