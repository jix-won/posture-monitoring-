# PostureIQ API Reference

## Classifier Module

Core algorithm for posture and activity classification.

### `Classifier.classify(ax, ay, az) → Object`

Classify activity based on accelerometer readings.

**Parameters:**
- `ax: number` - X-axis acceleration (m/s²)
- `ay: number` - Y-axis acceleration (m/s²)
- `az: number` - Z-axis acceleration (m/s²)

**Returns:**
```javascript
{
  label: 'good' | 'slouch' | 'walking' | 'stand' | 'calibrating',
  conf: 0-99  // Confidence percentage
}
```

**Example:**
```javascript
const result = Classifier.classify(0.1, 9.8, 0.2)
console.log(result)  // { label: 'good', conf: 85 }
```

### `Classifier.computeSMA(ax, ay, az) → number`

Calculate Signal Magnitude Area (acceleration intensity).

**Parameters:**
- `ax: number` - X-axis acceleration
- `ay: number` - Y-axis acceleration
- `az: number` - Z-axis acceleration

**Returns:** `number` (0-3 typical range)

**Example:**
```javascript
const sma = Classifier.computeSMA(0.1, 9.8, 0.2)
console.log(sma)  // 3.37
```

### `Classifier.reset() → void`

Reset classifier filter state (for new calibration session).

**Example:**
```javascript
Classifier.reset()
// Clears Butterworth filter memory and sliding window
```

### `Classifier.getWindowBuffer() → Array`

Get current sliding window data (for debugging).

**Returns:** `Array<{ax, ay, az, t}>` - Up to 128 samples

---

## Sensor Manager

Handles device motion event listeners and calibration.

### `SensorManager.requestPermission() → Promise<boolean>`

Request motion sensor permissions (iOS 13+ requirement).

**Returns:** Promise that resolves to `true` if granted

**Throws:** Error if permission denied

**Example:**
```javascript
try {
  await SensorManager.requestPermission()
  console.log('Permission granted')
} catch (error) {
  console.error('Permission denied:', error)
}
```

### `SensorManager.startListening(dataCallback, calibrationCallback) → void`

Start listening to device motion events.

**Parameters:**
- `dataCallback: Function(accel)` - Called on each sensor update
  ```javascript
  accel = { x: number, y: number, z: number }
  ```
- `calibrationCallback: Function(baseline)` - Called when calibration completes
  ```javascript
  baseline = { x: number, y: number, z: number }
  ```

**Example:**
```javascript
SensorManager.startListening(
  (accel) => {
    console.log('Accel:', accel.x, accel.y, accel.z)
  },
  (baseline) => {
    console.log('Baseline set:', baseline)
  }
)
```

### `SensorManager.stopListening() → void`

Stop listening to device motion events.

**Example:**
```javascript
SensorManager.stopListening()
```

### `SensorManager.resetCalibration() → void`

Reset calibration (for new device orientation).

**Example:**
```javascript
SensorManager.resetCalibration()
// Re-averaging will begin on next data batch
```

### `SensorManager.getCalibrationProgress() → number`

Get calibration progress (0-1).

**Returns:** `number` (0.0 to 1.0)

**Example:**
```javascript
const progress = SensorManager.getCalibrationProgress()
console.log(`${(progress * 100).toFixed(0)}% calibrated`)
```

### `SensorManager.getBaseline() → Object`

Get current sensor baseline.

**Returns:** `{ x: number, y: number, z: number }`

### `SensorManager.setBaseline(baseline) → void`

Set custom sensor baseline.

**Parameters:**
- `baseline: Object` - `{ x, y, z }`

**Example:**
```javascript
SensorManager.setBaseline({ x: 0.1, y: 0.2, z: 9.7 })
```

---

## UI Manager

Handles all DOM updates and rendering.

### `UIManager.updatePostureGauge(label, conf, ax, ay, az) → void`

Update posture display gauge.

**Parameters:**
- `label: string` - Activity label
- `conf: number` - Confidence (0-99)
- `ax, ay, az: number` - Current acceleration values

**Example:**
```javascript
UIManager.updatePostureGauge('good', 85, 0.1, 9.8, 0.2)
```

### `UIManager.drawSignalChart(data) → void`

Draw accelerometer signal chart.

**Parameters:**
- `data: Array<{ax, ay, az}>` - Signal data points

**Example:**
```javascript
const signalData = Analytics.getSignalBuffer()
UIManager.drawSignalChart(signalData)
```

### `UIManager.drawSMAChart(smaData) → void`

Draw signal magnitude area (SMA) chart.

**Parameters:**
- `smaData: Array<number>` - SMA values

### `UIManager.drawDonutChart(counts) → void`

Draw activity distribution donut chart.

**Parameters:**
- `counts: Object` - `{ good, slouch, walk, stand }`

### `UIManager.showAlert(message, duration) → void`

Show temporary alert banner.

**Parameters:**
- `message: string` - Alert text
- `duration: number` - Display duration in ms (default 5000)

**Example:**
```javascript
UIManager.showAlert('⚠️ Slouching detected!', 3000)
```

### `UIManager.setLoading(isLoading) → void`

Show/hide loading overlay.

**Parameters:**
- `isLoading: boolean`

### `UIManager.setMonitoringActive(isActive) → void`

Update status indicator dot.

**Parameters:**
- `isActive: boolean`

### `UIManager.showMonitoringContent(show) → void`

Toggle permission card visibility.

**Parameters:**
- `show: boolean` - Show monitoring content

### `UIManager.showTab(tabName) → void`

Switch to specified tab.

**Parameters:**
- `tabName: string` - 'monitor' | 'analytics' | 'history' | 'settings'

### `UIManager.updateHistoryList(sessions) → void`

Update session history display.

**Parameters:**
- `sessions: Array` - Historical session data

---

## Analytics Module

Handles score calculation and statistics.

### `Analytics.startSession() → void`

Initialize new monitoring session.

**Example:**
```javascript
Analytics.startSession()
```

### `Analytics.endSession() → Object`

Finalize session and return summary.

**Returns:**
```javascript
{
  timestamp: ms,
  duration: ms,
  score: 0-100,
  counts: { good, slouch, walk, stand }
}
```

**Example:**
```javascript
const session = Analytics.endSession()
console.log(`Session score: ${session.score}/100`)
```

### `Analytics.updateActivity(label) → void`

Track activity transition.

**Parameters:**
- `label: string` - Activity label

**Example:**
```javascript
Analytics.updateActivity('good')
```

### `Analytics.addSignalData(ax, ay, az) → void`

Add accelerometer sample to buffer.

**Parameters:**
- `ax, ay, az: number` - Acceleration values

### `Analytics.addSMAData(sma) → void`

Add SMA sample to buffer.

**Parameters:**
- `sma: number` - Signal magnitude area value

### `Analytics.calculateScore() → number`

Calculate current posture score.

**Returns:** `0-100`

**Formula:** `(Good×1.0 + Walk×0.8 + Stand×0.6) / Total × 100`

**Example:**
```javascript
const score = Analytics.calculateScore()
console.log(`Posture score: ${score}`)
```

### `Analytics.formatTime(seconds) → string`

Format duration as human-readable time.

**Parameters:**
- `seconds: number`

**Returns:** `'15m'` | `'45s'`

**Example:**
```javascript
console.log(Analytics.formatTime(900))   // '15m'
console.log(Analytics.formatTime(45))    // '45s'
```

### `Analytics.getCounts() → Object`

Get current activity counts.

**Returns:** `{ good, slouch, walk, stand }` (in seconds)

### `Analytics.getSignalBuffer() → Array`

Get accelerometer signal buffer.

**Returns:** `Array<{ax, ay, az}>`

### `Analytics.getSMABuffer() → Array`

Get SMA history buffer.

**Returns:** `Array<number>`

### `Analytics.getSessionDuration() → number`

Get elapsed session time.

**Returns:** Duration in seconds

### `Analytics.getTopActivity() → Object`

Get most frequent activity.

**Returns:**
```javascript
{
  label: string,
  icon: string,
  count: number
}
```

---

## App Controller

Main application orchestration.

### `AppController.requestPermission() → Promise`

Request sensor permissions and start monitoring.

**Example:**
```javascript
button.onclick = async () => {
  try {
    await AppController.requestPermission()
  } catch (error) {
    console.error('Failed:', error)
  }
}
```

### `AppController.startMonitoring() → void`

Start posture monitoring.

### `AppController.stopMonitoring() → void`

Stop monitoring and save session.

### `AppController.recalibrate() → void`

Reset sensor calibration.

### `AppController.toggleSetting(togId, key) → void`

Toggle a setting.

**Parameters:**
- `togId: string` - Toggle element ID
- `key: string` - Setting key

**Example:**
```javascript
AppController.toggleSetting('togAlert', 'alertEnabled')
```

### `AppController.handleToggleKeydown(event, togId, key) → void`

Handle keyboard navigation for toggles.

**Supports:** Space, Enter keys

### `AppController.toggleDarkMode() → void`

Toggle dark/light theme.

### `AppController.showTab(tabName) → void`

Switch to tab.

**Parameters:**
- `tabName: string` - 'monitor' | 'analytics' | 'history' | 'settings'
