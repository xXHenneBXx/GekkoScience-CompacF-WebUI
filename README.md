# GekkoScience-CompacF-WebUI
A Webpage Interface that shows live stats and be change and or set settings while live mining through the CGMiner API

# CompacF-WebUI

A modern React-based dashboard + Node backend for monitoring multiple GekkoScience Compac F miners over CGMiner.

# Features:

Multi-miner detection

Live stats refresh every 2 seconds

Hashrate graph

Per-miner metrics

Clean React UI powered by Vite

Simple Node.js CGMiner bridge API

Windows + Linux compatible

Optional Docker deployment

# 🚀 Setup Instructions
1. Requirements

You need:

Node.js (18+)

npm

CGMiner running on your miner host

Your miners visible at http://<miner-ip>:4028

# 🟦 Windows Setup
1. Backend
cd backend
npm install
node compac_f_bridge_backend.js


Backend runs at:

http://localhost:8080/stats

2. Frontend

Open a second terminal:

cd frontend
npm install
npm run dev


Open the dashboard:

http://localhost:3000/

# 🐧 Linux Setup (Ubuntu / Debian / Armbian)
1. Backend
cd backend
npm install
node compac_f_bridge_backend.js

2. Frontend
cd frontend
npm install
npm run dev


Open:

http://<your-linux-ip>:3000/

# 🐋 Docker Deployment

This runs backend + frontend together behind a single container.

Build & Run
docker compose up --build


Then open:

http://localhost:8080/

# 💡 Configuration
Backend default CGMiner target:
IP: 192.168.0.*
Port: 4028


To change this, edit:

backend/compac_f_bridge_backend.js

client.connect(4028, '192.168.0.200');


(We will add multi-IP support later.)

# 💻 Development Notes

Frontend reloads automatically with npm run dev

Backend auto-reload is optional (use nodemon)

Vite dev server supports hot-module-reload
