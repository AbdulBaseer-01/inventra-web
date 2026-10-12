# Inventra frontend

## Environment variables

Copy `.env.example` to `.env` if the local file does not already exist:

```powershell
Copy-Item .env.example .env
```

The frontend uses:

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | Yes | `http://localhost:5000` | Base URL of the backend API |

`VITE_*` values are bundled into browser code, so never put passwords, database
URLs, private tokens, or other secrets in this file.

## Run

```powershell
npm install
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.

There are currently no third-party API keys required by the frontend. If a
future integration needs a browser-safe public key, add it as a documented
`VITE_*` variable and keep private credentials in the backend instead.
