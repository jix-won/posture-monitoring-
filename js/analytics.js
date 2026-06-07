/**
 * Analytics Module
 * Handles score calculation and statistics tracking
 */

const Analytics = (() => {
  let sessionStart = null;
  let counts = { good: 0, slouch: 0, walk: 0, stand: 0 };
  let lastActivityLabel = null;
  let lastActivityTime = Date.now();
  let signalBuffer = [];
  let smaBuffer = [];
  const MAX_BUFFER = 100;

  /**
   * Initialize analytics for new session
   */
  function startSession() {
    sessionStart = Date.now();
    counts = { good: 0, slouch: 0, walk: 0, stand: 0 };
    signalBuffer = [];
    smaBuffer = [];
    lastActivityLabel = null;
    lastActivityTime = Date.now();
  }

  /**
   * End current session and return summary
   */
  function endSession() {
    if (!sessionStart) return null;

    const duration = Date.now() - sessionStart;
    const total = counts.good + counts.slouch + counts.walk + counts.stand || 1;
    const score = Math.round(
      Math.min(100, ((counts.good * 1.0 + counts.walk * 0.8 + counts.stand * 0.6) / total) * 100)
    );

    return {
      timestamp: sessionStart,
      duration,
      score,
      counts: { ...counts }
    };
  }

  /**
   * Update activity tracking with new classification
   */
  function updateActivity(label) {
    const now = Date.now();

    // Update counts for previous activity
    if (lastActivityLabel) {
      const elapsed = (now - lastActivityTime) / 1000;
      if (lastActivityLabel === 'good') counts.good += elapsed;
      else if (lastActivityLabel === 'slouch') counts.slouch += elapsed;
      else if (lastActivityLabel === 'walking') counts.walk += elapsed;
      else if (lastActivityLabel === 'stand') counts.stand += elapsed;
    }

    lastActivityLabel = label;
    lastActivityTime = now;
  }

  /**
   * Add data to signal buffer
   */
  function addSignalData(ax, ay, az) {
    signalBuffer.push({ ax, ay, az });
    if (signalBuffer.length > MAX_BUFFER) {
      signalBuffer.shift();
    }
  }

  /**
   * Add SMA value to buffer
   */
  function addSMAData(sma) {
    smaBuffer.push(sma);
    if (smaBuffer.length > MAX_BUFFER) {
      smaBuffer.shift();
    }
  }

  /**
   * Calculate posture score (0-100)
   */
  function calculateScore() {
    const total = counts.good + counts.slouch + counts.walk + counts.stand || 1;
    return Math.round(
      Math.min(100, ((counts.good * 1.0 + counts.walk * 0.8 + counts.stand * 0.6) / total) * 100)
    );
  }

  /**
   * Get score color based on value
   */
  function getScoreColor(score) {
    if (score >= 70) return 'var(--green)';
    if (score >= 40) return 'var(--amber)';
    return 'var(--red)';
  }

  /**
   * Get score feedback message
   */
  function getScoreMessage(score) {
    if (score >= 80) return '🌟 Excellent posture today!';
    if (score >= 60) return '👍 Decent, keep it up!';
    if (score >= 40) return '⚠️ Try to sit straighter';
    return '🔴 Needs attention';
  }

  /**
   * Format time duration
   */
  function formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    return `${Math.round(seconds / 60)}m`;
  }

  /**
   * Get current counts
   */
  function getCounts() {
    return { ...counts };
  }

  /**
   * Get signal buffer
   */
  function getSignalBuffer() {
    return [...signalBuffer];
  }

  /**
   * Get SMA buffer
   */
  function getSMABuffer() {
    return [...smaBuffer];
  }

  /**
   * Get session duration in seconds
   */
  function getSessionDuration() {
    if (!sessionStart) return 0;
    return (Date.now() - sessionStart) / 1000;
  }

  /**
   * Get top activity
   */
  function getTopActivity() {
    const activities = [
      { label: 'good', icon: '🧑‍💻', count: counts.good },
      { label: 'slouch', icon: '🫤', count: counts.slouch },
      { label: 'walk', icon: '🚶', count: counts.walk },
      { label: 'stand', icon: '🧍', count: counts.stand }
    ];

    const top = activities.sort((a, b) => b.count - a.count)[0];
    return top;
  }

  return {
    startSession,
    endSession,
    updateActivity,
    addSignalData,
    addSMAData,
    calculateScore,
    getScoreColor,
    getScoreMessage,
    formatTime,
    getCounts,
    getSignalBuffer,
    getSMABuffer,
    getSessionDuration,
    getTopActivity
  };
})();
