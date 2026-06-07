/**
 * Classifier Module
 * Handles posture and activity classification using accelerometer data
 */

const Classifier = (() => {
  // Butterworth low-pass filter coefficients
  // 2nd-order Butterworth, 20Hz cutoff, 50Hz sampling
  const B = [0.0675, 0.1349, 0.0675];
  const A = [1, -1.1430, 0.4128];

  // Filter state for each axis
  let fx = [0, 0];
  let fy = [0, 0];
  let fz = [0, 0];

  // Gravity vector separation state
  let filterState = [0, 0, 0];

  // Sliding window for feature extraction
  const WINDOW_SIZE = 128; // ~2.56s at 50Hz
  let windowBuf = [];

  /**
   * Apply low-pass filter to smooth sensor data
   */
  function lowPass(val, mem) {
    const out = B[0] * val + mem[0];
    mem[0] = B[1] * val - A[1] * out + mem[1];
    mem[1] = B[2] * val - A[2] * out;
    return out;
  }

  /**
   * Calculate Signal Magnitude Area (SMA)
   */
  function computeSMA(ax, ay, az) {
    return (Math.abs(ax) + Math.abs(ay) + Math.abs(az)) / 3;
  }

  /**
   * Separate gravity from body acceleration using low-pass filter
   */
  function separateGravity(ax, ay, az) {
    const ALPHA = 0.8;
    filterState[0] = ALPHA * filterState[0] + (1 - ALPHA) * ax;
    filterState[1] = ALPHA * filterState[1] + (1 - ALPHA) * ay;
    filterState[2] = ALPHA * filterState[2] + (1 - ALPHA) * az;

    return {
      grav: [...filterState],
      body: [
        ax - filterState[0],
        ay - filterState[1],
        az - filterState[2]
      ]
    };
  }

  /**
   * Add raw acceleration to sliding window
   */
  function addToWindow(ax, ay, az) {
    windowBuf.push({ ax, ay, az, t: Date.now() });
    if (windowBuf.length > WINDOW_SIZE) {
      windowBuf.shift();
    }
  }

  /**
   * Extract statistical features from window
   */
  function extractFeatures() {
    if (windowBuf.length < 20) return null;

    const n = windowBuf.length;
    let sumX = 0, sumY = 0, sumZ = 0;
    let sumX2 = 0, sumY2 = 0, sumZ2 = 0;
    let sma = 0;

    for (let i = 0; i < n; i++) {
      const { ax, ay, az } = windowBuf[i];
      sumX += ax;
      sumY += ay;
      sumZ += az;
      sumX2 += ax ** 2;
      sumY2 += ay ** 2;
      sumZ2 += az ** 2;
      sma += Math.abs(ax) + Math.abs(ay) + Math.abs(az);
    }

    const meanX = sumX / n;
    const meanY = sumY / n;
    const meanZ = sumZ / n;
    const stdX = Math.sqrt(Math.max(0, sumX2 / n - meanX ** 2));
    const stdY = Math.sqrt(Math.max(0, sumY2 / n - meanY ** 2));
    const stdZ = Math.sqrt(Math.max(0, sumZ2 / n - meanZ ** 2));
    const smaVal = sma / (3 * n);

    return { meanX, meanY, meanZ, stdX, stdY, stdZ, sma: smaVal };
  }

  /**
   * Rule-based classifier for activity detection
   * Returns: { label, confidence }
   */
  function classify(ax, ay, az) {
    try {
      // Apply low-pass filter
      const filteredX = lowPass(ax, fx);
      const filteredY = lowPass(ay, fy);
      const filteredZ = lowPass(az, fz);

      // Add to window
      addToWindow(filteredX, filteredY, filteredZ);

      // Extract features
      const { grav, body } = separateGravity(filteredX, filteredY, filteredZ);
      const features = extractFeatures();

      if (!features) {
        return { label: 'calibrating', conf: 0 };
      }

      const { sma, stdX, stdY, stdZ } = features;
      const totalStd = stdX + stdY + stdZ;

      // Calculate tilt angles from gravity vector
      const gravMag = Math.sqrt(
        grav[0] ** 2 + grav[1] ** 2 + grav[2] ** 2
      );
      const pitchAngle =
        Math.atan2(grav[0], Math.sqrt(grav[1] ** 2 + grav[2] ** 2)) *
        (180 / Math.PI);

      // Walking: high variability, significant body acceleration
      if (sma > 1.4 || totalStd > 2.5) {
        const conf = Math.min(99, 70 + (sma - 1.4) * 20);
        return { label: 'walking', conf: Math.round(conf) };
      }

      // Determine if sitting or standing from device orientation
      const isLikelyHorizontal = Math.abs(grav[2]) > 7;
      const isLikelyVertical = Math.abs(grav[1]) > 7;

      if (isLikelyHorizontal || (!isLikelyVertical && sma < 0.5)) {
        // Sitting - assess posture quality
        const slouchIndicator =
          Math.abs(pitchAngle) > 20 || (totalStd > 0.8 && sma < 0.9);

        if (slouchIndicator) {
          const conf = Math.round(
            Math.min(95, 75 + Math.abs(pitchAngle) * 0.5)
          );
          return { label: 'slouch', conf };
        } else {
          const conf = Math.round(
            Math.min(95, 80 + (1 - sma) * 10)
          );
          return { label: 'good', conf };
        }
      }

      // Standing
      if (sma < 0.5 && totalStd < 1.2) {
        const conf = Math.round(
          Math.min(92, 78 + (1 - totalStd) * 10)
        );
        return { label: 'stand', conf };
      }

      return { label: 'good', conf: 70 };
    } catch (error) {
      console.error('Classification error:', error);
      return { label: 'unknown', conf: 0 };
    }
  }

  /**
   * Reset classifier state (for calibration)
   */
  function reset() {
    fx = [0, 0];
    fy = [0, 0];
    fz = [0, 0];
    filterState = [0, 0, 0];
    windowBuf = [];
  }

  /**
   * Get current window buffer (for debugging)
   */
  function getWindowBuffer() {
    return [...windowBuf];
  }

  return {
    classify,
    computeSMA,
    reset,
    getWindowBuffer,
    addToWindow
  };
})();
