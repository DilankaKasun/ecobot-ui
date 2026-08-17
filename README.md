# EcoBot Next.js Dashboard

A modern, high-performance **Next.js 14 (App Router, TypeScript, Tailwind CSS, Three.js)** remote dashboard and AI control portal for the **EcoBot Autonomous Mobile Manipulator**.

---

## 🚀 Features

- **🌐 External Hosting:** Run on any PC, laptop, Docker container, or cloud host (Vercel, AWS, etc.) without consuming CPU/GPU on the Jetson.
- **📡 Dynamic Robot Connection:** Connects to the Jetson over WebSocket (`ws://<JETSON_IP>:9090`) with auto-reconnection and on-the-fly IP switching.
- **🎮 Teleoperation:** Touch/mouse Virtual Joystick and WASD keyboard controls with instant Emergency Stop.
- **📹 Live Dual-Camera Feeds:** RealSense D415 navigation camera & 4-DOF manipulator wrist camera.
- **🧊 3D SLAM & Point Cloud Viewer:** WebGL Three.js point-cloud visualization with orbit controls and real-time robot pose tracking.
- **🤖 Manipulator Studio:** 4-DOF joint sliders, Forward/Inverse Kinematics (FK/IK) target inputs, and Vision-Language-Action (VLA) prompt execution.
- **🌱 Autonomous Plant Mission Manager:** Multi-waypoint navigation queue, multi-angle photo capture triggers, and Google Gemini AI health diagnostics.
- **🎯 YOLOv8 Object Detection:** Live detection table with single-click visual servoing ("Approach" object).
- **📡 ESP32 Proximity Radar:** Visual gauges for dual VL53L0X Time-of-Flight sensors.

---

## 📦 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn or pnpm or bun

### 1. Install Dependencies
```bash
cd ecobot-dashboard-nextjs
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Connect to your Robot
Pass your Jetson's IP address directly in the URL:
```
http://localhost:3000?robot=192.168.1.150
```
*(You can also change the IP at any time in the top-right header or the Configuration page).*

---

## 🐳 Docker Deployment

### 1. Build Docker Image
```bash
docker build -t ecobot-dashboard-nextjs .
```

### 2. Run Container
```bash
docker run -d -p 3000:3000 --name ecobot-ui ecobot-dashboard-nextjs
```

---

## ☁️ 1-Click Vercel / Netlify Deployment

1. Push this folder to a GitHub repository.
2. Import repository into **Vercel** or **Netlify**.
3. Deploy! Open the URL: `https://your-dashboard.vercel.app?robot=<JETSON_IP_OR_TAILSCALE_IP>`

---

## 🔌 Robot Prerequisites (On the Jetson)

Ensure `rosbridge_server` and camera feeds are running on the Jetson:
```bash
ros2 launch ecobot_bringup ecobot.launch.py enable_rosbridge:=true
```

| Service | Port |
| :--- | :--- |
| **ROSBridge WebSocket** | `9090` |
| **RealSense Camera MJPEG** | `8081` |
| **Manipulator Wrist Camera MJPEG** | `8085` |
| **Obstacle Debug Stream** | `8083` |
