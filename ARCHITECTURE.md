# PostureIQ Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (UIManager)                    │
│         - DOM Updates, Canvas Rendering, Alerts              │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────────┐
│              Application Logic (AppController)               │
│  - Event Orchestration, Permission Handling, Settings        │
└──────┬─────────────┬──────────────┬────────────────┬────────┘
       │             │              │                │
   ┌───▼─────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌───────▼────┐
│Classifier │ │Analytics  │ │SensorMgr   │ │Preferences │
│           │ │           │ │            │ │(localStorage)│
│- Classify │ │- Score    │ │- Listen    │ │            │
│- Filter   │ │- Track    │ │- Calibrate │ │- Settings  │
│- Extract  │ │- Format   │ │- Baseline  │ │- Sessions  │
└───────────┘ └───────────┘ └────────────┘ └────────────┘
       │             │              │
       └─────────────┴──────────────┘
               │
       ┌───────▼────────────┐
       │  Device Sensors    │
       │  - Accelerometer   │
       │  - DeviceMotion    │
       └────────────────────┘
```

## Module Dependencies

```
index.html
    ├── styles.css
    └── js/
        ├── classifier.js (standalone)
        ├── sensors.js (standalone)
        ├── analytics.js (uses Classifier)
        ├── ui.js (standalone)
        └── app.js (orchestrates all)
            ├── uses: Classifier
            ├── uses: SensorManager
            ├── uses: Analytics
            └── uses: UIManager
```

## Data Flow

### Monitoring Session Flow

```
1. User clicks "Start Monitoring"
   │
   ├─→ AppController.requestPermission()
   │   ├─→ SensorManager.requestPermission() [iOS 13+]
   │   └─→ AppController.startMonitoring()
   │
   ├─→ Analytics.startSession()
   │
   ├─→ SensorManager.startListening()
   │   └─→ Listen to 'devicemotion' events
   │
   └─→ animationLoop() starts
       │
       └─→ Every ~20ms (50Hz):
           │
           ├─→ onDeviceMotion(accel)
           │   ├─→ Classifier.classify(ax, ay, az)
           │   │   ├─→ lowPass()
           │   │   ├─→ separateGravity()
           │   │   ├─→ extractFeatures()
           │   │   └─→ return { label, conf }
           │   │
           │   ├─→ Analytics.updateActivity(label)
           │   ├─→ Analytics.addSignalData(ax, ay, az)
           │   ├─→ Analytics.addSMAData(sma)
           │   │
           │   ├─→ UIManager.updatePostureGauge()
           │   └─→ handleAlerts(label)
           │
           └─→ Every 60 frames (1Hz):
               ├─→ UIManager.drawSignalChart()
               ├─→ UIManager.drawSMAChart()
               ├─→ UIManager.drawDonutChart()
               └─→ refreshAnalyticsDisplay()
```

## Classifier Algorithm Deep Dive

### 1. Low-Pass Filter (Butterworth)

```javascript
// 2nd-order Butterworth, 20Hz cutoff, 50Hz sampling
B = [0.0675, 0.1349, 0.0675]  // Feed-forward coefficients
A = [1, -1.1430, 0.4128]       // Feed-back coefficients

Filter equation (Direct Form II Transposed):
output = B[0]*input + mem[0]
mem[0] = B[1]*input - A[1]*output + mem[1]
mem[1] = B[2]*input - A[2]*output
```

**Purpose:** Remove sensor noise and high-frequency jitter

### 2. Gravity Separation

```javascript
ALPHA = 0.8  // Exponential moving average factor

For each axis:
gravity = ALPHA * gravity_prev + (1 - ALPHA) * accel
body = accel - gravity
```

**Purpose:** Isolate body acceleration from static tilt

### 3. Sliding Window

```javascript
WINDOW_SIZE = 128 samples  // ~2.56 seconds at 50Hz
OVERLAP = 50%

// Features extracted from window:
- mean(X, Y, Z)
- std(X, Y, Z)
- SMA = (|X| + |Y| + |Z|) / 3
```

**Purpose:** Capture temporal patterns for robust classification

### 4. Rule-Based Classifier

```javascript
if (SMA > 1.4 OR std_total > 2.5) {
  return { label: 'walking', conf: 70-99 }
}

if (horizontal_orientation) {
  if (pitch_angle > 20° OR bad_posture_indicator) {
    return { label: 'slouch', conf: 75-95 }
  } else {
    return { label: 'good', conf: 80-95 }
  }
}

if (vertical_orientation AND low_movement) {
  return { label: 'stand', conf: 78-92 }
}

default: return { label: 'good', conf: 70 }
```

## State Management

### AppController State

```javascript
const settings = {
  alertEnabled: boolean,      // Slouch alert on/off
  sitReminder: boolean,       // 30-min reminder on/off
  soundEnabled: boolean,      // Audio feedback on/off
  darkMode: boolean          // Dark/light theme
}

const slouchTracking = {
  slouchStartTime: timestamp,    // When slouching began
  slouchAlertFired: boolean      // Alert already triggered
}

const sessionData = [
  {
    timestamp: ms,
    duration: ms,
    score: 0-100,
    counts: { good, slouch, walk, stand }
  }
]
```

### Analytics State

```javascript
const counts = {
  good: seconds,      // Total good posture time
  slouch: seconds,    // Total slouching time
  walk: seconds,      // Total walking time
  stand: seconds      // Total standing time
}

const buffers = {
  signalBuffer: [],   // Last 100 accel samples
  smaBuffer: []       // Last 100 SMA values
}

const activityTracking = {
  lastActivityLabel: string,   // Current activity
  lastActivityTime: timestamp  // When it started
}
```

## Performance Optimizations

### 1. Circular Buffers
- Signal and SMA buffers limited to 100 entries
- Prevents unbounded memory growth

### 2. requestAnimationFrame
- Chart updates tied to screen refresh (60 FPS max)
- Efficient battery usage vs polling

### 3. Canvas DPI Scaling
```javascript
const dpr = window.devicePixelRatio
canvas.width = rect.width * dpr
canvas.height = rect.height * dpr
ctx.scale(dpr, dpr)
```
Prevents blurry charts on retina displays

### 4. Lazy Evaluation
- Analytics only updated when activity changes
- Charts only redrawn when data changes

## Error Handling

### Graceful Degradation

```
Desktop (no DeviceMotionEvent)
    ↓
Simulated sensor data
    ↓
Full functionality for testing

No localStorage
    ↓
Session data only in memory
    ↓
Lost on refresh (non-critical)

Audio context unavailable
    ↓
Vibration alerts only
    ↓
Core monitoring still works
```

## Testing Strategy

### Unit Tests (Recommended)

```javascript
// Test Classifier
test('classify good posture', () => {
  const result = Classifier.classify(0.1, 9.8, 0.2)
  expect(result.label).toBe('good')
})

// Test Analytics
test('calculate score correctly', () => {
  Analytics.startSession()
  Analytics.updateActivity('good')  // 30s
  Analytics.updateActivity('slouch') // 10s
  const score = Analytics.calculateScore()
  expect(score).toBeGreaterThan(70)
})

// Test SensorManager
test('calibration progress', () => {
  SensorManager.resetCalibration()
  expect(SensorManager.getCalibrationProgress()).toBe(0)
})
```

### Integration Tests

```javascript
// Full monitoring session
test('complete monitoring session', async () => {
  await AppController.requestPermission()
  AppController.startMonitoring()
  
  // Simulate sensor data for 10 seconds
  for (let i = 0; i < 500; i++) {
    handleSensorData({ x: 0.1, y: 9.8, z: 0.2 })
  }
  
  AppController.stopMonitoring()
  const session = Analytics.endSession()
  
  expect(session.score).toBeGreaterThan(0)
  expect(session.counts.good).toBeGreaterThan(0)
})
```

## Extension Points

### Adding New Activity Type

1. Add to LABELS/ICONS/COLORS in UIManager:
```javascript
const LABELS = {
  // ... existing
  lying: 'Lying Down'
}
```

2. Add classification rule in Classifier:
```javascript
if (isHorizontalAnd0GSeparation()) {
  return { label: 'lying', conf: 85 }
}
```

3. Add tracking in Analytics:
```javascript
const counts = {
  // ... existing
  lying: 0
}
```

### Adding ML Model

```javascript
// Replace rule-based classifier with ML
async function classifyWithML(features) {
  const model = await tf.loadGraphModel('model.json')
  const prediction = model.predict(tf.tensor([features]))
  return prediction
}
```

## Deployment

### Static Hosting

```bash
# GitHub Pages
git push origin main
# Automatically deployed to https://jix-won.github.io/posture-monitoring

# Netlify
netlify deploy --prod --dir=.

# Vercel
vercel
```

### Security Headers

```
Content-Security-Policy: default-src 'self' fonts.googleapis.com
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=31536000
```

## Monitoring & Debugging

### Console Logging

```javascript
// Enable detailed logging
window.DEBUG = true

// In code:
if (window.DEBUG) console.log('classification:', result)
```

### Performance Profiling

```javascript
console.time('classification')
const result = Classifier.classify(ax, ay, az)
console.timeEnd('classification')  // <5ms expected
```

### Network Monitoring

```
DevTools → Network:
- Should only see: HTML, CSS, JS, Fonts
- No requests to analytics or tracking services
```
