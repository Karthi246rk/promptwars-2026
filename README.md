# 🏛️ CivicResolve

**AI-powered Civic Issue Reporting, Triage & Resolution Platform**

CivicResolve empowers citizens to report civic issues — potholes, water leaks, streetlight outages, and more — and uses Google's Gemini AI to automatically triage, categorize, prioritize, and route them to the appropriate municipal department.

---

## ✨ Features

- **AI-Powered Triage** — Issues are automatically categorized, prioritized (with a 1–100 score), and routed using Gemini multimodal AI
- **Image Analysis** — Upload photos of civic issues for AI-enhanced classification
- **Smart Fallback** — Deterministic rule-based triage when the AI is unavailable, ensuring 100% uptime
- **Real-Time Dashboard** — Track issue statistics, resolution rates, and department workloads
- **Citizen Engagement** — Upvote issues to signal community priority
- **Issue Lifecycle** — Full status tracking from Reported → Acknowledged → In Progress → Resolved
- **Filtering & Search** — Filter issues by status, category, priority, and department
- **Responsive UI** — Works on desktop and mobile with a modern Material-inspired design

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **AI Engine** | Google Gemini API (`@google/genai`) |
| **Storage** | In-memory with JSON file persistence |
| **Testing** | Node.js native test runner (`node:test`) |
| **Containerization** | Docker (multi-stage build) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- A **Google Gemini API key** (optional — the app works without one using rule-based fallback)

### 1. Clone & Install

```bash
git clone <repository-url>
cd promptwars-2026
npm run install:all
```

### 2. Configure Environment

Copy the example environment file and add your API key:

```bash
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

### 3. Run in Development

```bash
npm run dev
```

This starts both the backend (port 8080) and frontend (port 5173) concurrently.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 📡 API Documentation

All endpoints are prefixed with `/api`.

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health, model info, and storage mode |

**Response:**
```json
{
  "status": "ok",
  "primaryModel": "gemini-4-hydrogen",
  "fallbackModel": "gemini-3.8-flash",
  "storageMode": "memory",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/issues` | List all issues (supports query filters) |
| `POST` | `/api/issues` | Create a new issue (triggers AI triage) |
| `PATCH` | `/api/issues/:id` | Update issue status or details |
| `DELETE` | `/api/issues/:id` | Delete an issue |
| `POST` | `/api/issues/:id/upvote` | Upvote an issue |

#### Query Filters for `GET /api/issues`

| Parameter | Type | Example |
|-----------|------|---------|
| `status` | string | `?status=Reported` |
| `category` | string | `?category=Road%20%26%20Potholes` |
| `priority` | string | `?priority=High` |
| `department` | string | `?department=Public%20Works` |

#### Create Issue — `POST /api/issues`

**Request Body:**
```json
{
  "title": "Large pothole on Main Street",
  "description": "Deep pothole near the school causing traffic hazards",
  "location": "Main Street & 5th Ave",
  "image": "(optional) base64-encoded image"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "trackingId": "CR-20260101-ABC1",
  "title": "Large pothole on Main Street",
  "status": "Reported",
  "category": "Road & Potholes",
  "priority": "High",
  "priorityScore": 72,
  "department": "Public Works",
  "aiSummary": "AI-generated summary...",
  "aiPowered": true,
  "modelUsed": "gemini-4-hydrogen",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Aggregate statistics and breakdowns |

**Response:**
```json
{
  "total": 42,
  "byStatus": { "Reported": 10, "In Progress": 15, "Resolved": 17 },
  "byCategory": { "Road & Potholes": 12, "Water Leakage & Supply": 8 },
  "byPriority": { "Critical": 3, "High": 10, "Medium": 20, "Low": 9 },
  "resolutionRate": 40.5,
  "averagePriorityScore": 52.3
}
```

---

## 🧪 Testing

Tests use Node.js native test runner — no external test dependencies required.

```bash
npm test
```

Tests cover:
- Health check endpoint
- CRUD operations on issues
- AI triage (rule-based fallback)
- Filtering and query parameters
- Upvoting
- Statistics aggregation
- Input validation

---

## 🐳 Docker Deployment

### Build & Run

```bash
docker build -t civicresolve .
docker run -p 8080:8080 --env-file .env civicresolve
```

The container serves both the API and the production-built frontend on port 8080.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | — | Google Gemini API key for AI triage |
| `GEMINI_MODEL` | No | `gemini-4-hydrogen` | Primary Gemini model |
| `GEMINI_FALLBACK_MODEL` | No | `gemini-3.8-flash` | Fallback Gemini model |
| `PORT` | No | `8080` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |

---

## 📁 Project Structure

```
promptwars-2026/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.tsx           # Main application
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                  # Express backend
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic (Gemini AI, storage)
│   │   ├── __tests__/        # API tests
│   │   └── index.ts          # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── package.json             # Root workspace scripts
├── Dockerfile               # Multi-stage production build
├── .dockerignore
├── .env.example             # Environment template
└── README.md
```

---

## 📄 License

MIT
