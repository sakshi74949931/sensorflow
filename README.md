

TODO: Document your project here
# 1. Create the database schema (one time)
cd backend
npm run migrate

npm run build

# 2. Start backend
npm start       # or: npm run dev

# 3. Start frontend (separate terminal)
cd frontend
npm run dev     # → http://localhost:8080

admin@inditronics.io 
password


# Inditronics — Full-Stack Noise Monitoring Dashboard

> **Authority dashboard for noise monitoring, live sensor data, alarms, device control, and reporting.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Flow](#4-architecture-flow)
5. [Database Schema](#5-database-schema)
6. [Backend API Reference](#6-backend-api-reference)
7. [Frontend Pages](#7-frontend-pages)
8. [Authentication Flow](#8-authentication-flow)
9. [Real-Time WebSocket Flow](#9-real-time-websocket-flow)
10. [Login Credentials](#10-login-credentials)
11. [How to Start the Project](#11-how-to-start-the-project)
12. [Environment Variables](#12-environment-variables)
13. [Common Errors & Fixes](#13-common-errors--fixes)

---

## 1. Project Overview

Inditronics ek **full-stack web application** hai jo field devices se noise sensor data collect karta hai, live dashboard pe dikhata hai, threshold breach hone pe alarms raise karta hai, aur reports generate karta hai.

### Business Purpose
- Authorities ko daily noise levels dikhana — location, device, aur time ke basis par
- Admin ko devices manage, configure, aur monitor karne dena
- Alarm raise karna jab noise threshold cross ho
- Location-wise, date-wise, hour-wise reports export karna (CSV/PDF)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI Components** | shadcn/ui + Tailwind CSS + Radix UI |
| **Charts** | Recharts |
| **Map** | Leaflet.js |
| **State / Data** | React Query + React Context |
| **Real-time** | Socket.IO (WebSocket) |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | MySQL (mysql2) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Build Tool** | TypeScript Compiler (tsc) |

---

## 3. Project Structure

```
updated sensor flow/
│
├── backend/                        ← Express API Server
│   ├── src/
│   │   ├── index.ts                ← Entry point — Express + Socket.IO + Auto-migrate
│   │   ├── db/
│   │   │   ├── connection.ts       ← MySQL pool setup
│   │   │   ├── schema.ts           ← CREATE TABLE IF NOT EXISTS (all 12 tables)
│   │   │   ├── seed.ts             ← Seeds default users on first startup
│   │   │   └── queries.ts          ← All DB query functions (devices, alarms, reports...)
│   │   ├── routes/
│   │   │   ├── auth.ts             ← POST /login, /register, /logout, /refresh, GET /me
│   │   │   ├── devices.ts          ← CRUD + /latest + /readings
│   │   │   ├── monitoring.ts       ← GET/POST sensor readings
│   │   │   ├── alarms.ts           ← GET, acknowledge, resolve
│   │   │   ├── reports.ts          ← GET, hourly, daily, POST generate
│   │   │   ├── locations.ts        ← CRUD locations
│   │   │   └── events.ts           ← GET/POST device events
│   │   ├── middleware/
│   │   │   ├── authorization.ts    ← verifyToken, requireRole, optionalAuth
│   │   │   └── validation.ts       ← Input validation (email, password, device)
│   │   └── utils/
│   │       └── errors.ts           ← AppError class + asyncHandler + errorHandler
│   ├── .env                        ← DB credentials, JWT secret, CORS origin
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                       ← React Vite App
│   ├── src/
│   │   ├── main.tsx                ← React root mount
│   │   ├── App.tsx                 ← Router + Providers setup
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       ← Login form with show/hide password + error codes
│   │   │   ├── DashboardPage.tsx   ← KPI cards + top noisy locations + recent alarms
│   │   │   ├── DevicesPage.tsx     ← Device CRUD table + API integration
│   │   │   ├── MonitoringPage.tsx  ← Live chart + WebSocket + device grid
│   │   │   ├── MapPage.tsx         ← Leaflet map with device markers
│   │   │   ├── AlarmsPage.tsx      ← Alarm table + acknowledge/resolve + API
│   │   │   ├── ReportsPage.tsx     ← Hourly/Daily/Location tabs + CSV export
│   │   │   └── SettingsPage.tsx    ← Threshold config + Location management
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     ← Login state, token storage, demo fallback
│   │   ├── components/
│   │   │   ├── AppLayout.tsx       ← Sidebar + main content wrapper
│   │   │   ├── AppSidebar.tsx      ← Navigation sidebar
│   │   │   ├── ProtectedRoute.tsx  ← Redirects to /login if not authenticated
│   │   │   └── ui/                 ← shadcn/ui components (Button, Card, Table...)
│   │   ├── lib/
│   │   │   └── apiClient.ts        ← All API calls (fetch + AbortController timeout)
│   │   └── data/
│   │       └── mock-data.ts        ← Demo data used when backend is offline
│   ├── .env                        ← VITE_API_URL=http://localhost:5000/api
│   ├── vite.config.ts              ← Port 8080, path alias @/
│   └── index.html                  ← Tab title "Inditronics" + SVG favicon
│
└── README.md                       ← This file
```

---

## 4. Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Port 8080)                      │
│                                                             │
│  LoginPage → AuthContext → apiClient → fetch()             │
│       ↓                                                     │
│  Dashboard / Devices / Monitoring / Alarms / Reports        │
│       ↓                          ↑                          │
│  apiClient.ts ──── HTTP ─────────┤                          │
│  socket.io-client ─ WS ──────────┤                          │
└──────────────────────────────────┼──────────────────────────┘
                                   │
                    HTTP + WebSocket (Port 5000)
                                   │
┌──────────────────────────────────▼──────────────────────────┐
│                   BACKEND (Node.js + Express)                │
│                                                             │
│  index.ts                                                   │
│    ├── Express middlewares (cors, json, logging)            │
│    ├── Socket.IO server (live-reading events)               │
│    ├── Auto: createSchema() → CREATE TABLE IF NOT EXISTS    │
│    ├── Auto: seedDefaultUsers() → inserts admin on start    │
│    └── Routes:                                              │
│         /api/auth      → auth.ts                            │
│         /api/devices   → devices.ts                         │
│         /api/monitoring→ monitoring.ts                      │
│         /api/alarms    → alarms.ts                          │
│         /api/reports   → reports.ts                         │
│         /api/locations → locations.ts                       │
│         /api/events    → events.ts                          │
│                                   │                         │
│  DB Queries (queries.ts)          │                         │
│    └── MySQL Pool ────────────────┘                         │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  MySQL Database                              │
│                  (sound_sense_flow)                         │
│                                                             │
│  users, locations, devices, monitoring_data,                │
│  thresholds, alarms, device_events, reports,                │
│  notifications, maintenance_logs, audit_logs                │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts — email, bcrypt password, role (admin/authority/support/user) |
| `locations` | Sites — name, address, latitude, longitude, type |
| `devices` | Noise sensors — device_id, location_id, firmware_version, status, last_heartbeat |
| `monitoring_data` | Sensor readings — device_id, sound_level (dB), frequency_range, timestamp |
| `thresholds` | Alert limits — device_id, warning/critical dB level |
| `alarms` | Alarm events — severity, status (active/acknowledged/resolved), triggered_at |
| `device_events` | Device lifecycle events — offline, reboot, OTA, breach |
| `reports` | Generated report metadata — type (daily/weekly/monthly), file_path |
| `notifications` | User notifications linked to alarms |
| `maintenance_logs` | Device maintenance records |
| `audit_logs` | All user actions tracked |

### Key Relationships
```
locations  ←── devices ←── monitoring_data
                  │
                  └──── alarms ──── notifications
                  │
                  └──── device_events
                  │
                  └──── thresholds
```

---

## 6. Backend API Reference

### Auth — `/api/auth`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| POST | `/login` | No | Login with email + password → returns JWT token |
| POST | `/register` | No | Create new account |
| GET | `/me` | Yes | Get current user info |
| POST | `/logout` | Yes | Logout (clear client token) |
| POST | `/refresh` | Yes | Get new JWT token |

### Devices — `/api/devices`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/` | No | List all devices |
| GET | `/:id` | No | Get single device |
| GET | `/:id/latest` | No | Latest sensor reading for device |
| GET | `/:id/readings` | No | Reading history (supports ?limit=60) |
| POST | `/` | Admin | Create device |
| PUT | `/:id` | Admin | Update device |
| DELETE | `/:id` | Admin | Delete device |

### Monitoring — `/api/monitoring`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/` | Yes | Get readings (filter: ?device_id, ?start_date, ?end_date) |
| POST | `/` | Admin | Record new reading (also emits WebSocket event) |

### Alarms — `/api/alarms`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/` | Yes | List alarms (filter: ?device_id, ?severity, ?status) |
| GET | `/:id` | Yes | Single alarm |
| PATCH | `/:id/acknowledge` | Yes | Mark alarm as acknowledged |
| PATCH | `/:id/resolve` | Admin/Authority | Mark alarm as resolved |

### Reports — `/api/reports`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/` | Yes | List reports |
| GET | `/hourly` | Yes | Hourly aggregates (?date, ?device_id) |
| GET | `/daily` | Yes | Daily aggregates (?start_date, ?end_date) |
| POST | `/` | Yes | Generate/save a report |

### Locations — `/api/locations`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/` | No | List all locations |
| GET | `/:id` | No | Single location |
| POST | `/` | Admin | Create location |
| PATCH | `/:id` | Admin | Update location |
| DELETE | `/:id` | Admin | Delete location |

### Events — `/api/events`
| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | `/` | Yes | List device events (filter: ?device_id, ?event_type, ?severity) |
| POST | `/` | Yes | Create device event |

---

## 7. Frontend Pages

### `/` — Dashboard
- **KPI Cards**: Total Devices, Online Count, Active Alarms, Avg Noise Today
- **Bar Chart**: Top noisy locations
- **Recent Alarms**: Last 5 alarms with severity + status
- **Data source**: Tries real API → falls back to mock data

### `/devices` — Device Management
- **Table**: All devices with ID, Name, Location, Status, Firmware, Last dB
- **Add/Edit/Delete**: Dialog form + API call (optimistic update)
- **Search**: Real-time filter by name or ID
- **Refresh**: Manual reload from API

### `/monitoring` — Live Monitoring
- **Live/Simulated badge**: Green = WebSocket connected, Grey = simulated every 5s
- **Current Reading card**: Large dB display with color coding
- **Line Chart**: Last 60 readings with threshold reference line
- **Device Grid**: All devices, click to switch selected device
- **WebSocket**: Connects to `ws://localhost:5000`, listens for `live-reading` events

### `/map` — Map View
- **Leaflet map** centered on Mumbai (default)
- **Colored markers**:
  - 🟢 Green = Online, no alarm
  - 🔴 Red = Offline
  - 🟡 Yellow = Active alarm
- **Popup**: Device name, location, status, last reading, threshold warning

### `/alarms` — Alarm Console
- **Filter**: All / Active / Acknowledged / Resolved
- **Table**: Severity, Device, Location, dB, Triggered time, Ack By, Status
- **Acknowledge button**: Calls `PATCH /alarms/:id/acknowledge` + updates UI
- **Resolve button**: Calls `PATCH /alarms/:id/resolve` + updates UI
- **Refresh**: Reload from API

### `/reports` — Reports
- **3 Tabs**:
  - **Hourly Report** — Bar chart + table of hourly dB averages
  - **Daily Report** — Day-by-day table from API
  - **Location Summary** — Per-location avg/max/min/breach count
- **Filters**: Location, Date From, Date To
- **CSV Export**: Downloads filtered data as `.csv`
- **Print/PDF**: Uses `window.print()`

### `/settings` — Settings (Admin)
- **Noise Thresholds**: Warning dB + Critical dB (saved to localStorage)
- **Location Master**: Add / Edit / Delete locations (admin only)
- Role check: Non-admin users see thresholds as read-only

### `/login` — Login
- Email + Password fields
- **Show/Hide Password** toggle (eye icon)
- **Error display** with HTTP status code badge (e.g., `Invalid email or password` `401`)
- Role selector (Admin / Authority / Support) — for demo mode

---

## 8. Authentication Flow

```
User submits form
       │
       ▼
AuthContext.login(email, password, role)
       │
       ├─── 1. POST /api/auth/login
       │         │
       │         ├─── validateLoginRequest (email format, min 6 char password)
       │         ├─── getUserByEmail(email)  ← MySQL users table
       │         ├─── bcrypt.compare(password, user.password)
       │         └─── jwt.sign({ id, email, role }) → returns token + user
       │
       ├─── SUCCESS:
       │    • Store token in localStorage ("auth_token")
       │    • Store user in localStorage ("noise_user")
       │    • Set user in React state
       │    • Navigate to "/"
       │
       ├─── 401/403 ERROR:
       │    • Show error message + status code on login form
       │    • Do NOT fall back to demo mode
       │
       └─── NETWORK ERROR (backend down):
            • Fall back to demo mode
            • Match email against mockUsers list
            • Set demo token ("demo_TIMESTAMP")
            • Login succeeds with mock user

Page refresh:
       │
       └─── restoreUser() reads localStorage("noise_user")
            → User stays logged in

Logout:
       │
       ├─── Clear localStorage (auth_token, noise_user)
       ├─── Set user = null in React state
       └─── POST /api/auth/logout (fire-and-forget)
```

### JWT Details
- **Secret**: Set in `backend/.env` as `JWT_SECRET`
- **Expiry**: 7 days (`JWT_EXPIRE=7d`)
- **Payload**: `{ id, email, role }`
- **Header**: `Authorization: Bearer <token>` (sent by apiClient automatically)

### Role-Based Access
| Role | Permissions |
|------|------------|
| `admin` | Full access — create/delete devices, locations, resolve alarms, all reports |
| `authority` | View dashboard, monitoring, map, alarms (resolve), reports |
| `support` | View dashboard, monitoring, alarms (acknowledge), device events |
| `user` | Basic view only |

---

## 9. Real-Time WebSocket Flow

```
Backend starts
       │
       └─── Socket.IO server on port 5000

Frontend MonitoringPage loads
       │
       └─── io("http://localhost:5000") connects
            │
            ├─── socket.on("connect") → badge shows "🟢 Live"
            └─── socket.on("disconnect") → badge shows "⚫ Simulated"

Device sends reading (POST /api/monitoring)
       │
       ├─── Save to MySQL monitoring_data table
       └─── io.emit("live-reading", { device_id, sound_level, timestamp })
                   │
                   └─── All connected clients receive it
                         │
                         └─── MonitoringPage updates chart in real-time

If WebSocket NOT connected:
       └─── setInterval every 5 seconds → simulate random reading
            (shows "⚫ Simulated" badge)
```

---

## 10. Login Credentials

### Default Users (auto-created on first backend start)

| Email | Password | Role |
|-------|----------|------|
| `admin@inditronics.io` | `password` | Admin |
| `authority@inditronics.io` | `password` | Authority |
| `support@inditronics.io` | `password` | Support |
| `admin@test.com` | `password` | Admin |
| `user@test.com` | `password` | User |

> **Note:** Passwords are stored as bcrypt hashes in the database.

---

## 11. How to Start the Project

### Prerequisites
- Node.js v18+
- MySQL running locally (default port 3306)
- MySQL database `sound_sense_flow` created

```sql
-- Run this in MySQL once:
CREATE DATABASE IF NOT EXISTS sound_sense_flow;
```

### Step 1 — Configure Backend
```bash
cd backend
# Edit .env if needed (DB password, ports)
```

`backend/.env`:
```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root          ← your MySQL root password
DB_NAME=sound_sense_flow
JWT_SECRET=sound_sense_flow_secure_key_xK9mP2qR
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:8080
```

### Step 2 — Start Backend
```bash
cd backend
npm install          # first time only
npm start            # runs compiled dist/index.js
# OR for development (no build needed):
npm run dev
```

Backend starts at: **http://localhost:5000**

On first start you will see:
```
✓ Connected to MySQL database
✓ Database schema created successfully
🌱 Seeding default users...
✓ 5 default users created
   📧 admin@inditronics.io / password
✅ Sound Sense Flow Backend Started
📍 Server: http://localhost:5000
🔌 WebSocket: ws://localhost:5000
```

### Step 3 — Start Frontend
```bash
cd frontend
npm install          # first time only
npm run dev
```

Frontend starts at: **http://localhost:8080**

### Step 4 — Login
Open **http://localhost:8080** → Login with:
- Email: `admin@inditronics.io`
- Password: `password`

---

## 12. Environment Variables

### Backend — `backend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Express server port |
| `NODE_ENV` | `development` | Environment mode |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | *(empty)* | MySQL password |
| `DB_NAME` | `sound_sense_flow` | Database name |
| `JWT_SECRET` | fallback key | JWT signing secret |
| `JWT_EXPIRE` | `7d` | Token expiry |
| `CORS_ORIGIN` | `http://localhost:8080` | Allowed frontend URL |

### Frontend — `frontend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |

---

## 13. Common Errors & Fixes

### Login shows `401 Invalid email or password`
**Cause:** Database connected but users table empty, or wrong email/password.

**Fix:** Backend auto-seeds users on startup. Just restart the backend:
```bash
cd backend && npm start
```
Then use `admin@inditronics.io` / `password`.

---

### `Cannot find module 'dist/index.js'`
**Cause:** TypeScript not compiled yet.

**Fix:**
```bash
cd backend
npm run build   # compiles src/ → dist/
npm start
```

---

### `'vite' is not recognized`
**Cause:** `node_modules` not installed.

**Fix:**
```bash
cd frontend
npm install
npm run dev
```

---

### `Access denied for user 'root'@'localhost'`
**Cause:** Wrong MySQL password in `.env`.

**Fix:** Update `backend/.env`:
```
DB_PASSWORD=your_actual_mysql_password
```

---

### `react-leaflet` peer dependency error
**Cause:** `react-leaflet@5` requires React 19, but project uses React 18.

**Fix:** Already fixed — using `react-leaflet@^4.2.1`.

---

### CORS error in browser console
**Cause:** Frontend port doesn't match `CORS_ORIGIN` in backend `.env`.

**Fix:** Make sure `CORS_ORIGIN=http://localhost:8080` in `backend/.env` (frontend runs on 8080).

---

### WebSocket shows "Simulated" badge
**Cause:** Backend not running or WebSocket blocked.

**Fix:** Start backend → monitoring page auto-connects. Badge turns "🟢 Live".

---

## Data Flow Summary

```
[Noise Sensor Device]
        │ POST /api/monitoring
        ▼
[Backend — Express]
        ├── Saves to MySQL (monitoring_data table)
        ├── Checks thresholds → creates alarm if breach
        └── io.emit("live-reading") → WebSocket to all clients
                    │
                    ▼
        [Frontend — MonitoringPage]
                    ├── Chart updates in real-time
                    ├── Current dB card updates
                    └── If dB > threshold → badge shows "Exceeds threshold"

[Admin User on Browser]
        ├── Views Dashboard (aggregated stats)
        ├── Manages Devices (add/edit/delete via API)
        ├── Sees Map (Leaflet markers colored by status)
        ├── Handles Alarms (acknowledge → resolve)
        ├── Downloads Reports (CSV with hourly/daily/location data)
        └── Configures Settings (thresholds + location master)
```

---

*Generated for Inditronics project — Sound Sense Flow v1.0.0*
