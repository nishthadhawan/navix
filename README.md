# 🧭 NaviX

AI-powered safe navigation app that generates the safest route between two locations, with verified waypoints featuring nearby hospitals and police stations.

## Features

- **AI Safety Analysis** – ChatGPT evaluates route segments for safety
- **Smart Waypoints** – Top 5 safest stops with hospital & police proximity
- **Interactive Map** – Leaflet.js with custom markers and route polyline
- **Multiple Travel Modes** – Driving, cycling, walking
- **Real-time Routing** – OpenRouteService directions API

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React + Vite, Leaflet.js, Axios     |
| Backend  | Node.js, Express, Axios             |
| APIs     | OpenRouteService, OpenAI GPT-4o-mini|

## Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Backend

```bash
cd server
npm install
```

Create a `.env` file in `server/` (already provided):
```
OPENAI_API_KEY=your_openai_key
ORS_API_KEY=your_ors_key
PORT=5000
```

Start the server:
```bash
node index.js
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

1. Enter a **Start Location** (e.g. "Mumbai")
2. Enter a **Destination** (e.g. "Pune")
3. Select a **Travel Mode**
4. Click **Find Safest Route**
5. View the route on the map with safe waypoint markers
6. Click any blue marker to see safety details

## API

### `POST /api/route`

**Request:**
```json
{
  "start": "Mumbai",
  "end": "Pune",
  "profile": "driving-car"
}
```

**Response:**
```json
{
  "route": { "type": "Feature", "geometry": {...} },
  "distance": 150000,
  "duration": 7200,
  "waypoints": [
    {
      "name": "Lonavala",
      "latitude": 18.75,
      "longitude": 73.41,
      "nearest_hospital": "Lonavala Hospital",
      "nearest_police_station": "Lonavala Police Station",
      "approx_distance_from_start_km": 82,
      "reason": "Well-populated hill station with hospitals and police"
    }
  ]
}
```

## Folder Structure

```
NaviX/
├── client/           # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── MapView.jsx
│       │   └── RouteForm.jsx
│       ├── App.jsx
│       └── index.css
├── server/           # Express backend
│   ├── services/
│   │   ├── openaiService.js
│   │   └── orsService.js
│   ├── routes/
│   │   └── route.js
│   ├── index.js
│   └── .env
└── README.md
```
