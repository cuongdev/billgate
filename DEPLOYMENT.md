# Deployment Guide – BillGate - Auto Bank Gateway

This document describes how to configure environment variables and deploy the application (Docker Compose or local).

---

## 1. System requirements

- **Node.js** 18+ (20+ recommended)
- **Docker** and **Docker Compose** (for Docker-based deployment)
- **PostgreSQL** 13+ (via Docker or installed locally)
- **Firebase** (Google) account for authentication and FCM

---

## 2. Environment configuration

The app uses **two** env locations:

- **Project root** (`.env`): for Docker Compose and the server when running via `docker compose`.
- **Client** (`client/.env`): for the Vite frontend (build-time); only variables with the `VITE_` prefix are used.

### 2.1. Root `.env` (server / Docker)

Copy from the example file and fill in values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 Client ID (Web) from Google Cloud Console; used for backend auth. |
| `JWT_SECRET` | Yes | Secret for signing JWTs (API + WebSocket). In production use a long, random string. |
| `JWT_ISSUER` | No | JWT issuer (default: `vpbank-mini-app`). |
| `JWT_AUDIENCE` | No | JWT audience (default: `vpbank-mini-app`). |
| `INTERNAL_API_SECRET` | Yes (prod) | Secret for internal server ↔ worker / callbacks. |

**How to get GOOGLE_CLIENT_ID**

1. Open [Firebase Console](https://console.firebase.google.com) and select your project.
2. **Project Settings** (gear) → **General** → scroll to **Your apps**.
3. If you don’t have a Web app yet: **Add app** → **Web** (</>) → register it.
4. Go to [Google Cloud Console – Credentials](https://console.cloud.google.com/apis/credentials) (same project as Firebase).
5. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
6. Application type: **Web application** (or use the “Web client” created when adding the Firebase Web app).
7. Copy the **Client ID** (e.g. `xxx.apps.googleusercontent.com`) into `GOOGLE_CLIENT_ID`.

**Firebase Admin (Service Account)**

The backend needs a Service Account to verify Firebase tokens and use FCM. Choose **one** of:

- **Option 1 – File (recommended for Docker)**  
  1. Firebase Console → **Project Settings** → **Service accounts**.  
  2. **Generate new private key** → download the JSON file.  
  3. Rename it to `service-account.json` and place it in the `server/` directory.  
  4. Docker Compose mounts `./server/service-account.json:/app/service-account.json` and sets `GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json` — no extra env var needed.

- **Option 2 – Env var (CI/K8s)**  
  1. Download the JSON as above.  
  2. Copy the **entire** file content (single JSON string) into `FIREBASE_SERVICE_ACCOUNT_JSON`.  
  3. Add env `FIREBASE_SERVICE_ACCOUNT_JSON` in docker-compose or K8s (and you can skip mounting the file).

**Example root `.env`**

```env
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
JWT_SECRET=your-long-random-secret-do-not-use-default
JWT_ISSUER=vpbank-mini-app
JWT_AUDIENCE=vpbank-mini-app
INTERNAL_API_SECRET=your-internal-api-secret
```

---

### 2.2. `client/.env` (Frontend – Vite)

Copy from the example and fill in values:

```bash
cp client/.env.example client/.env
```

Variables (only those with the `VITE_` prefix are included in the build):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend URL (API + WebSocket). Local: `http://localhost:3000`, production: `https://your-api-domain.com`. |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase Web API key (Google sign-in). |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Usually `your-project.firebaseapp.com`. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID. |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Usually `your-project.appspot.com`. |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Sender ID from Firebase config. |
| `VITE_FIREBASE_APP_ID` | Yes | App ID (e.g. `1:xxx:web:yyy`). |
| `VITE_MEASUREMENT_ID` | No | Google Analytics (e.g. `G-XXXXXXXXXX`). |

**How to get Firebase Web config**

1. Firebase Console → **Project Settings** → **General** → **Your apps**.
2. Select your Web app (or Add app → Web) → copy the full config (apiKey, authDomain, projectId, …).
3. Map each value to the corresponding `VITE_FIREBASE_*` variable.

**Example `client/.env`**

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Note:** After changing `client/.env`, **rebuild** the client (`npm run build --prefix client`) so the new values are baked into the build.

---

## 3. Deployment with Docker Compose

### 3.1. Prerequisites

1. **Env configuration**
   - Create root `.env` (see § 2.1).
   - Create `client/.env` (see § 2.2).

2. **Firebase Service Account**
   - Place `server/service-account.json` (see § 2.1 – Option 1).

3. **Build client first**
   - The Dockerfile copies `client/dist` into the image, so build the client on the host (or in CI) before building the image:

   ```bash
   npm run build --prefix client
   ```

   Ensure `client/.env` is correct for the target environment (especially `VITE_API_URL`).

### 3.2. Run Docker Compose

From the project root:

```bash
docker compose up -d
```

On first run this will:

- Build the `vpbank-server` image (reused for the worker).
- Create the Postgres volume and start Postgres, Temporal, Temporal UI, vpbank-server, and vpbank-worker.
- Run migrations (create DB if needed, then `db:migrate`).

### 3.3. Services and ports

| Service | Port (host) | Notes |
|---------|-------------|--------|
| **vpbank-server** | 3000 | API + WebSocket + static client (client/dist). |
| **temporal-ui** | 8080 | Temporal UI (optional, for workflow inspection). |
| **postgres** | 5432 | Expose only when debugging/backing up from host. |
| **temporal** | 7233 | Temporal gRPC. |

After `docker compose up -d` is healthy:

- App: **http://localhost:3000**
- Temporal UI (optional): **http://localhost:8080**

### 3.4. Stop / teardown

```bash
docker compose down
```

Postgres volume is kept (data preserved):

```bash
docker compose down
# volumes remain; next up reuses data
```

Remove volumes (DB data is lost):

```bash
docker compose down -v
```

---

## 4. Local run (without Docker)

Suitable for development.

### 4.1. Requirements

- Node.js 18+
- Postgres 13+ running locally or remotely, with a database (e.g. `vpbank_dev`) created.
- Temporal server running (e.g. Docker for postgres + temporal only, or Temporal Cloud).

### 4.2. Env configuration

- **Root:** create `.env` (GOOGLE_CLIENT_ID, JWT_SECRET, INTERNAL_API_SECRET, …). For local Postgres:

  ```env
  PG_HOST=127.0.0.1
  PG_PORT=5432
  PG_USER=postgres
  PG_PASSWORD=your-password
  PG_DATABASE=vpbank_dev
  TEMPORAL_ADDRESS=localhost:7233
  ```

- **Client:** `client/.env` with `VITE_API_URL=http://localhost:3000` (or the port your server uses).

- **Firebase:** place `server/service-account.json` in `server/`.

### 4.3. Run

```bash
# Install dependencies
npm run install-all

# Run migrations (once or when schema changes)
cd server && npx sequelize-cli db:migrate && cd ..

# Start server + client (dev)
npm run dev
```

- Server usually listens on port 3000 (or `PORT` from env).
- Client (Vite) runs on its own port (e.g. 5173); configure Vite proxy if needed to reach the API.

**Temporal worker** (run separately if you need workflow processing):

```bash
cd server && npm run worker
```

---

## 5. Production checklist

- [ ] **JWT_SECRET**: Long, random string; do not use the default.
- [ ] **INTERNAL_API_SECRET**: Unique secret; do not use the default.
- [ ] **GOOGLE_CLIENT_ID** and **Firebase Service Account**: Correct project; required APIs (e.g. Firebase Auth) enabled.
- [ ] **client/.env** (build): `VITE_API_URL` points to production backend (https).
- [ ] **CORS**: Backend allows the production frontend origin if different.
- [ ] **HTTPS**: Use HTTPS for both frontend and API in production.
- [ ] **Postgres**: Strong password; avoid exposing the port publicly.
- [ ] **Temporal**: If using Temporal Cloud or your own cluster, set `TEMPORAL_ADDRESS` and secure the connection.
- [ ] **Timezone**: Docker Compose sets `TZ=Asia/Ho_Chi_Minh`; DB uses TIMESTAMPTZ (UTC); client displays GMT+7.

---

## 6. Common commands summary

```bash
# Copy env examples
cp .env.example .env
cp client/.env.example client/.env
# (Edit .env and client/.env per § 2)

# Build client (required before Docker build)
npm run build --prefix client

# Deploy with Docker Compose
docker compose up -d

# View logs
docker compose logs -f vpbank-server
docker compose logs -f vpbank-worker

# Run migrations (if starting server without compose for the first time)
cd server && npx sequelize-cli db:migrate
```

You can extend this guide (e.g. CI/CD, reverse proxy, env per environment) as needed.
