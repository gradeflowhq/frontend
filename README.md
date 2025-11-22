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