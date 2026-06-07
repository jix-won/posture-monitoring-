/**
 * Main Application Controller
 * Orchestrates all modules and handles application logic
 */

const AppController = (() => {
  let isMonitoring = false;
  let sessionData = [];
  let animationFrameId = null;

  // Settings from localStorage
  const settings = {
    alertEnabled: true,
    sitReminder: true,
    soundEnabled: false,
    darkMode: true
  };

  // Alert state
  let slouchStartTime = null;
  let slouchAlertFired = false;

  /**
   * Initialize app on load
   */
  function init() {
    console.log('PostureIQ v2.0 initializing...');
    loadSettings();
    setupEventListeners();
    initDarkMode();
    restoreSessionData();
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Resize canvas on window resize
    window.addEventListener('resize', () => {
      if (isMonitoring) {
        const signalBuffer = Analytics.getSignalBuffer();
        const smaBuffer = Analytics.getSMABuffer();
        UIManager.drawSignalChart(signalBuffer);
        UIManager.drawSMAChart(smaBuffer);
      }
    });
  }

  /**
   * Request sensor permission and start monitoring
   */
  async function requestPermission() {
    try {
      UIManager.setLoading(true);

      // Request permission
      await SensorManager.requestPermission();

      // Start monitoring
      startMonitoring();
    } catch (error) {
      console.error('Permission error:', error);
      UIManager.showAlert('Failed to access motion sensors. Using simulated data.');
      startMonitoring();
    } finally {
      UIManager.setLoading(false);
    }
  }

  /**
   * Start posture monitoring
   */
  function startMonitoring() {
    if (isMonitoring) return;

    isMonitoring = true;
    Analytics.startSession();
    UIManager.showMonitoringContent(true);
    UIManager.setMonitoringActive(true);
    UIManager.addFeedItem('Monitoring started', 'var(--teal)');

    // Start sensor listening
    SensorManager.startListening(
      handleSensorData,
      handleCalibrationComplete
    );

    // Start animation loop for chart updates
    if (!animationFrameId) {
      animationLoop();
    }
  }

  /**
   * Stop monitoring and save session
   */
  function stopMonitoring() {
    if (!isMonitoring) return;

    isMonitoring = false;
    SensorManager.stopListening();
    UIManager.setMonitoringActive(false);
    UIManager.addFeedItem('Monitoring stopped', 'var(--red)');

    // Save session
    const session = Analytics.endSession();
    if (session) {
      sessionData.push(session);
      saveSessionData();
      UIManager.updateHistoryList(sessionData);
    }

    // Cancel animation frame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Handle incoming sensor data
   */
  function handleSensorData(accel) {
    if (!isMonitoring) return;

    try {
      const { x: ax, y: ay, z: az } = accel;

      // Classify activity
      const result = Classifier.classify(ax, ay, az);

      // Update UI
      UIManager.updatePostureGauge(result.label, result.conf, ax, ay, az);

      // Track analytics
      Analytics.updateActivity(result.label);
      Analytics.addSignalData(ax, ay, az);
      const sma = Classifier.computeSMA(ax, ay, az);
      Analytics.addSMAData(sma);

      // Handle alerts
      handleAlerts(result.label);
    } catch (error) {
      console.error('Error processing sensor data:', error);
    }
  }

  /**
   * Handle calibration completion
   */
  function handleCalibrationComplete(baseline) {
    console.log('Calibration complete:', baseline);
    UIManager.showAlert('✅ Calibration complete! Starting monitoring...');
  }

  /**
   * Handle slouch and sitting alerts
   */
  function handleAlerts(label) {
    // Slouch alert
    if (label === 'slouch') {
      if (!slouchStartTime) {
        slouchStartTime = Date.now();
        slouchAlertFired = false;
      }

      const slouchDuration = (Date.now() - slouchStartTime) / 1000;
      if (slouchDuration >= 60 && !slouchAlertFired && settings.alertEnabled) {
        triggerAlert(
          '⚠️ Slouch detected for 60s — Fix your posture!',
          'slouch'
        );
        slouchAlertFired = true;

        // Vibrate
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }

        // Play sound
        if (settings.soundEnabled) {
          playAlertSound();
        }
      }
    } else {
      slouchStartTime = null;
      slouchAlertFired = false;
    }
  }

  /**
   * Trigger alert with feedback
   */
  function triggerAlert(message, type = 'info') {
    UIManager.showAlert(message);
  }

  /**
   * Play alert sound
   */
  function playAlertSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio context not available:', error);
    }
  }

  /**
   * Animation loop for real-time chart updates
   */
  function animationLoop() {
    if (isMonitoring) {
      // Update charts
      UIManager.drawSignalChart(Analytics.getSignalBuffer());
      UIManager.drawSMAChart(Analytics.getSMABuffer());

      // Update analytics display
      refreshAnalyticsDisplay();
    }

    animationFrameId = requestAnimationFrame(animationLoop);
  }

  /**
   * Refresh analytics panel display
   */
  function refreshAnalyticsDisplay() {
    try {
      const counts = Analytics.getCounts();
      const score = Analytics.calculateScore();
      const total = counts.good + counts.slouch + counts.walk + counts.stand || 1;

      // Update time displays
      document.getElementById('goodTime').textContent = Analytics.formatTime(
        counts.good
      );
      document.getElementById('slouchTime').textContent = Analytics.formatTime(
        counts.slouch
      );
      document.getElementById('walkTime').textContent = Analytics.formatTime(
        counts.walk
      );
      document.getElementById('standTime').textContent = Analytics.formatTime(
        counts.stand
      );

      // Update timeline bar
      document.getElementById('barGood').style.width =
        (counts.good / total * 100) + '%';
      document.getElementById('barSlouch').style.width =
        (counts.slouch / total * 100) + '%';
      document.getElementById('barWalk').style.width =
        (counts.walk / total * 100) + '%';
      document.getElementById('barStand').style.width =
        (counts.stand / total * 100) + '%';

      // Update score
      document.getElementById('scoreNum').textContent = score;
      const arc = document.getElementById('scoreArc');
      const circumference = 289;
      arc.setAttribute(
        'stroke-dashoffset',
        circumference - (score / 100) * circumference
      );
      arc.setAttribute('stroke', Analytics.getScoreColor(score));
      document.getElementById('scoreLabel').textContent =
        Analytics.getScoreMessage(score);

      // Update donut chart
      UIManager.drawDonutChart(counts);

      // Update top activity
      const top = Analytics.getTopActivity();
      document.getElementById('topActivity').textContent = top.icon;
      document.getElementById('topActivityLabel').textContent = top.label;
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    }
  }

  /**
   * Recalibrate sensor baseline
   */
  function recalibrate() {
    UIManager.showAlert('🔄 Starting recalibration...');
    Classifier.reset();
    SensorManager.resetCalibration();
    UIManager.setLoading(true);

    // Simulate calibration completion
    setTimeout(() => {
      UIManager.setLoading(false);
      UIManager.showAlert('✅ Recalibration complete!');
    }, 3000);
  }

  /**
   * Toggle settings
   */
  function toggleSetting(togId, key) {
    const toggle = document.getElementById(togId);
    settings[key] = toggle.classList.toggle('on');
    saveSettings();
  }

  /**
   * Handle keyboard navigation for toggles
   */
  function handleToggleKeydown(event, togId, key) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleSetting(togId, key);
    }
  }

  /**
   * Toggle dark mode
   */
  function toggleDarkMode() {
    const toggle = document.getElementById('togDarkMode');
    settings.darkMode = toggle.classList.toggle('on');
    applyDarkMode(settings.darkMode);
    saveSettings();
  }

  /**
   * Apply dark mode
   */
  function applyDarkMode(isDark) {
    if (isDark) {
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.style.colorScheme = 'light';
    }
  }

  /**
   * Initialize dark mode from preference
   */
  function initDarkMode() {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (prefersLight && settings.darkMode) {
      settings.darkMode = false;
    }
    applyDarkMode(settings.darkMode);
  }

  /**
   * Show/hide tab
   */
  function showTab(tabName, tabElement) {
    UIManager.showTab(tabName);
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    try {
      localStorage.setItem('postureiq_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    try {
      const saved = localStorage.getItem('postureiq_settings');
      if (saved) {
        Object.assign(settings, JSON.parse(saved));
        applySettingsToUI();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Apply settings to UI
   */
  function applySettingsToUI() {
    if (settings.alertEnabled) {
      document.getElementById('togAlert').classList.add('on');
    }
    if (settings.sitReminder) {
      document.getElementById('togSit').classList.add('on');
    }
    if (settings.soundEnabled) {
      document.getElementById('togSound').classList.add('on');
    }
    if (settings.darkMode) {
      document.getElementById('togDarkMode').classList.add('on');
    }
  }

  /**
   * Save session data to localStorage
   */
  function saveSessionData() {
    try {
      localStorage.setItem('postureiq_sessions', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  /**
   * Restore session data from localStorage
   */
  function restoreSessionData() {
    try {
      const saved = localStorage.getItem('postureiq_sessions');
      if (saved) {
        sessionData = JSON.parse(saved);
        UIManager.updateHistoryList(sessionData);
      }
    } catch (error) {
      console.error('Error restoring sessions:', error);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    requestPermission,
    startMonitoring,
    stopMonitoring,
    recalibrate,
    toggleSetting,
    handleToggleKeydown,
    toggleDarkMode,
    showTab
  };
})();
