# GradeFlow Frontend

## Setup

Install dependencies:
```
npm install
```

Generate models, API client, and schemas from backend. Make sure backend is running.
```
npx orval
node scripts/extract-schemas.js
```

Run frontend
```
npm run dev -- --host
```

## Using Container

Run frontend:

```
docker run -d -p 5173:80 \
  -e API_URL=https://api.example.com \
  -e CORS_PROXY_URL=https://cors-proxy.example.com \
  ghcr.io/gradeflowhq/gradeflow-frontend:latest
```

## Canvas via CORS proxy

Canvas API requests originate from the browser and are proxied through the Caddy-based `cors-proxy` service.

The frontend reads `VITE_CORS_PROXY_URL` (default `http://localhost:8080`); override in `frontend/.env`.