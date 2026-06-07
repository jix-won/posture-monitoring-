# PostureIQ v2.0

**Personal Posture & Activity Monitor** — Real-time posture detection using device accelerometer with completely on-device processing.

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-brightgreen.svg)

## 🎯 Features

- **Real-time Posture Detection** — Classify posture as Good, Slouching, Standing, or Walking
- **On-Device Processing** — All calculations happen locally, zero data collection
- **Activity Analytics** — Track posture habits over time with detailed statistics
- **Smart Alerts** — Customizable notifications when slouching persists for 60+ seconds
- **Session History** — Save and review past monitoring sessions
- **Dark/Light Mode** — System preference detection with manual toggle
- **Responsive Design** — Works seamlessly on mobile, tablet, and desktop
- **Accessibility First** — Full keyboard navigation and screen reader support
- **Battery Optimized** — Uses `requestAnimationFrame` for smooth, efficient updates

## 📁 Project Structure

```
posture-monitoring/
├── index.html              # Main HTML entry point
├── styles.css              # Global styling (dark/light mode)
├── js/
│   ├── classifier.js       # Posture classification algorithm
│   ├── sensors.js          # Device motion sensor management
│   ├── ui.js               # UI rendering and updates
│   ├── analytics.js        # Statistics and score calculation
│   └── app.js              # Main application controller
└── README.md              # This file
```

## 🚀 Getting Started

### Requirements
- Modern browser with DeviceMotionEvent support
- Mobile device (iPhone/Android) for accurate sensor data
- Desktop: Simulated data for testing

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/jix-won/posture-monitoring-.git
cd posture-monitoring
```

2. **Open in browser:**
```bash
# Simple HTTP server (Python 3)
python -m http.server 8000

# Or Node.js
npx http-server
```

3. **Navigate to** `http://localhost:8000`

## 📱 Usage

### Start Monitoring
1. Click **"Start Monitoring"** button
2. Grant motion sensor permissions (iOS 13+ required)
3. Hold device naturally (phone on desk for sitting, in hand for standing)
4. Monitor real-time posture in Live tab

### View Analytics
- **Posture Score** — 0-100 based on weighted activity time
- **Time Breakdown** — Good/Slouch/Walk/Stand durations
- **Activity Distribution** — Donut chart of activity percentages
- **Signal Graphs** — Real-time accelerometer and SMA visualization

### Customize Settings
- **Slouch Alerts** — Enable/disable vibration on poor posture
- **Sitting Reminders** — Alert after 30 min of inactivity
- **Sound Alerts** — Play audio tone alongside vibration
- **Dark Mode** — Toggle dark/light theme
- **Recalibrate** — Reset sensor baseline for new device orientation

### Session History
All sessions are saved to browser localStorage and persisted across sessions. View past monitoring data in the **History** tab.

## 🧠 Algorithm

### Posture Classification Pipeline

```
Raw Accelerometer Data
          ↓
   [Low-Pass Filter]  — 20Hz Butterworth (removes jitter)
          ↓
  [Gravity Separation] — Isolate gravity from body acceleration
          ↓
 [Feature Extraction]  — Mean, Std Dev, SMA from 2.56s window
          ↓
  [Rule-Based Rules]   — Classify activity based on thresholds
          ↓
    Activity Label     — good | slouch | walking | stand
```

### Classification Rules

| Activity | Conditions |
|----------|-----------|
| **Walking** | SMA > 1.4 OR Total StdDev > 2.5 |
| **Slouching** | Pitch angle > 20° OR (StdDev > 0.8 AND SMA < 0.9) |
| **Good Posture** | Horizontal orientation + low slouch indicator |
| **Standing** | Vertical orientation + SMA < 0.5 + StdDev < 1.2 |

### Score Calculation

```
Score = (Good × 1.0 + Walk × 0.8 + Stand × 0.6) / Total × 100

Score Tiers:
  80-100: 🌟 Excellent
  60-79:  👍 Decent
  40-59:  ⚠️  Needs improvement
  0-39:   🔴 Critical
```

## 🏗️ Architecture

### Module System

```javascript
// Classifier Module — Activity classification
Classifier.classify(ax, ay, az) → { label, confidence }
Classifier.computeSMA(ax, ay, az) → float
Classifier.reset() → void

// Sensor Manager — Motion event handling
SensorManager.requestPermission() → Promise
SensorManager.startListening(callback, calibrationCallback) → void
SensorManager.stopListening() → void
SensorManager.getCalibrationProgress() → 0-1
SensorManager.resetCalibration() → void

// UI Manager — DOM updates
UIManager.updatePostureGauge(label, conf, ax, ay, az) → void
UIManager.drawSignalChart(data) → void
UIManager.drawSMAChart(data) → void
UIManager.drawDonutChart(counts) → void
UIManager.showAlert(message, duration) → void
UIManager.setLoading(isLoading) → void

// Analytics — Statistics tracking
Analytics.startSession() → void
Analytics.endSession() → { timestamp, duration, score, counts }
Analytics.updateActivity(label) → void
Analytics.calculateScore() → 0-100
Analytics.formatTime(seconds) → "15m" | "45s"

// App Controller — Orchestration
AppController.requestPermission() → Promise
AppController.startMonitoring() → void
AppController.stopMonitoring() → void
AppController.recalibrate() → void
AppController.toggleSetting(togId, key) → void
```

## 🎨 Styling & Responsive Design

### CSS Features
- **CSS Variables** — Centralized color/spacing system
- **Dark Mode** — `@media (prefers-color-scheme: light/dark)`
- **Responsive** — Mobile-first breakpoints at 640px, 768px, 1024px
- **Accessibility** — Focus states, high contrast, reduced motion support
- **Canvas DPI** — Automatic scaling for retina displays

### Breakpoints
```css
Mobile:   < 640px
Tablet:   640px - 1024px
Desktop:  > 1024px
```

## 💾 Data Storage

### localStorage Keys
```javascript
'postureiq_settings'  // User preferences (JSON)
'postureiq_sessions'  // Historical session data (JSON)
```

**Data Privacy:** All processing is 100% on-device. No data is sent to servers.

## 🔒 Security & Privacy

✅ **Zero Data Collection** — Device motion data never leaves your device
✅ **No Network Requests** — Except font loading from Google Fonts
✅ **HTTPS Ready** — Works on secure connections
✅ **Offline Capable** — Fully functional without internet (except initial load)

## 🐛 Troubleshooting

### Sensors Not Working
**Problem:** "No permission prompt appeared"
```
Solution:
- iOS 13+: Open Safari → Settings → Motion & Orientation
- Android: Check app permissions for accelerometer
- Desktop: Simulator data will be used automatically
```

### Inaccurate Posture Detection
**Problem:** Consistently misclassifying activity
```
Solution:
1. Go to Settings tab
2. Click "Recalibrate Baseline"
3. Place phone in natural resting position
4. Wait 3 seconds for calibration
```

### Charts Not Updating
**Problem:** Signal/SMA charts appear blank
```
Solution:
- Wait 5-10 seconds for buffer to fill
- Check browser console for errors
- Try refreshing the page
- Clear localStorage: localStorage.clear()
```

### localStorage Full
**Problem:** "QuotaExceededError" when saving sessions
```
Solution:
1. Open DevTools → Application → Storage
2. Click "Clear site data"
3. Restart monitoring
```

## 📊 Performance

- **Update Rate:** 50Hz (20ms per update)
- **Chart Refresh:** 60 FPS via requestAnimationFrame
- **Memory Usage:** ~5-10MB during active monitoring
- **Battery Impact:** Minimal (uses requestAnimationFrame, no polling)
- **Calculation Time:** <5ms per classification

## 🔧 Development

### Building & Testing

```bash
# No build step required — vanilla JavaScript

# Run local server
python -m http.server 8000

# Test on mobile
# 1. Get local IP: ipconfig (Windows) or ifconfig (Mac/Linux)
# 2. Visit http://<your-ip>:8000 on phone
```

### Debugging

```javascript
// Enable console logging in DevTools
console.log(Classifier.getWindowBuffer());        // See raw data
console.log(Analytics.getCounts());               // View counters
console.log(SensorManager.getCalibrationProgress()); // Calibration %
```

### Browser DevTools
```
1. Open DevTools (F12)
2. Application → Local Storage
3. Inspect 'postureiq_settings' and 'postureiq_sessions'
4. Monitor Network for external requests (Google Fonts only)
```

## 🚀 Future Enhancements

- [ ] Multi-language support
- [ ] Export data as CSV/PDF
- [ ] Cloud sync with optional privacy-preserving encryption
- [ ] Wearable integration (smartwatch support)
- [ ] ML model for improved accuracy
- [ ] Mobile app (React Native)
- [ ] Browser extension for desktop monitoring
- [ ] Social challenges & leaderboards

## 📜 License

MIT License — Free for personal and commercial use

```
Copyright (c) 2026 Jituraj Kalita

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
```

## 👤 Author

**Jituraj Kalita**  
Department of Computer Science  
Gauhati University

## 🙏 Acknowledgments

- **Butterworth Filter** — Signal processing reference
- **Web APIs** — DeviceMotionEvent, localStorage, requestAnimationFrame
- **Typography** — Google Fonts (Space Mono, DM Sans)
- **Inspiration** — Health & wellness applications

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/jix-won/posture-monitoring-/issues)
- **Email:** jix-won@github.com
- **Documentation:** See inline code comments

---

**PostureIQ v2.0** — *Sit better. Feel better. Live better.* 🧍‍♀️✨
