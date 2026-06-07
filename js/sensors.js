/**
 * Sensors Module
 * Handles device motion event listeners and sensor data collection
 */

const SensorManager = (() => {
  let isListening = false;
  let calibrationSamples = [];
  let baseline = { x: 0, y: 0, z: 9.8 };
  let onDataCallback = null;
  let onCalibrationCompleteCallback = null;

  const CALIBRATION_SAMPLES = 100;

  /**
   * Request device motion permissions (iOS 13+)
   */
  async function requestPermission() {
    return new Promise((resolve, reject) => {
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        // iOS 13+
        DeviceMotionEvent.requestPermission()
          .then((permission) => {
            if (permission === 'granted') {
              resolve(true);
            } else {
              reject(new Error('Permission denied'));
            }
          })
          .catch(reject);
      } else if (typeof DeviceMotionEvent !== 'undefined') {
        // Android - no permission required, but HTTPS is needed
        // Check if running on HTTPS or localhost
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        if (!isSecure) {
          console.warn('⚠️ HTTPS required for sensors on Android. Using simulated data.');
          resolve(false); // Signal to use simulation
        } else {
          resolve(true);
        }
      } else {
        // No DeviceMotionEvent support
        console.warn('Device motion not supported');
        resolve(false);
      }
    });
  }

  /**
   * Start listening to device motion events
   */
  function startListening(dataCallback, calibrationCallback) {
    if (isListening) return;

    onDataCallback = dataCallback;
    onCalibrationCompleteCallback = calibrationCallback;

    window.addEventListener('devicemotion', handleDeviceMotion, true);
    isListening = true;

    // Fallback: simulate data on desktop or if sensor access fails
    if (!isDeviceMotionSupported()) {
      console.log('Device motion not supported, using simulated data');
      simulateSensorData();
    }
  }

  /**
   * Stop listening to device motion events
   */
  function stopListening() {
    if (!isListening) return;

    window.removeEventListener('devicemotion', handleDeviceMotion, true);
    isListening = false;
  }

  /**
   * Check if device supports motion events
   */
  function isDeviceMotionSupported() {
    return typeof window.DeviceMotionEvent !== 'undefined';
  }

  /**
   * Handle device motion event
   */
  function handleDeviceMotion(event) {
    try {
      const acc = event.acceleration;
      if (!acc || (typeof acc.x === 'undefined' && typeof acc.y === 'undefined' && typeof acc.z === 'undefined')) {
        // Fallback to simulation if no real data
        if (!isListening) return;
        simulateSensorData();
        return;
      }

      let ax = acc.x || 0;
      let ay = acc.y || 0;
      let az = acc.z || 0;

      // Apply baseline calibration
      ax -= baseline.x;
      ay -= baseline.y;
      az -= baseline.z;

      // Collect calibration samples
      if (calibrationSamples.length < CALIBRATION_SAMPLES) {
        calibrationSamples.push({ x: ax, y: ay, z: az });

        if (calibrationSamples.length === CALIBRATION_SAMPLES) {
          completeCalibration();
        }

        return; // Don't process data during calibration
      }

      // Process data
      if (onDataCallback) {
        onDataCallback({ x: ax, y: ay, z: az });
      }
    } catch (error) {
      console.error('Error processing sensor data:', error);
    }
  }

  /**
   * Complete calibration and calculate baseline
   */
  function completeCalibration() {
    if (calibrationSamples.length === 0) return;

    const n = calibrationSamples.length;
    let sumX = 0, sumY = 0, sumZ = 0;

    for (const sample of calibrationSamples) {
      sumX += sample.x;
      sumY += sample.y;
      sumZ += sample.z;
    }

    // Store average as new baseline
    baseline = {
      x: sumX / n,
      y: sumY / n,
      z: sumZ / n
    };

    console.log('Calibration complete:', baseline);

    if (onCalibrationCompleteCallback) {
      onCalibrationCompleteCallback(baseline);
    }
  }

  /**
   * Reset calibration
   */
  function resetCalibration() {
    calibrationSamples = [];
    baseline = { x: 0, y: 0, z: 9.8 };
  }

  /**
   * Simulate sensor data for desktop testing
   */
  function simulateSensorData() {
    if (!isListening) return;

    // Simulate oscillating acceleration with realistic values
    const t = Date.now() / 1000;
    const ax = Math.sin(t * 0.5) * 2;
    const ay = Math.cos(t * 0.3) * 1.5 + 9.8;
    const az = Math.sin(t * 0.7) * 1.5;

    if (onDataCallback) {
      onDataCallback({ x: ax, y: ay, z: az });
    }

    // Continue simulation
    requestAnimationFrame(simulateSensorData);
  }

  /**
   * Get current baseline
   */
  function getBaseline() {
    return { ...baseline };
  }

  /**
   * Set custom baseline
   */
  function setBaseline(customBaseline) {
    baseline = { ...customBaseline };
  }

  /**
   * Check if currently calibrating
   */
  function isCalibrating() {
    return calibrationSamples.length > 0 && calibrationSamples.length < CALIBRATION_SAMPLES;
  }

  /**
   * Get calibration progress (0-1)
   */
  function getCalibrationProgress() {
    return Math.min(1, calibrationSamples.length / CALIBRATION_SAMPLES);
  }

  return {
    requestPermission,
    startListening,
    stopListening,
    resetCalibration,
    getBaseline,
    setBaseline,
    isCalibrating,
    getCalibrationProgress,
    isDeviceMotionSupported,
    isListening: () => isListening
  };
})();
