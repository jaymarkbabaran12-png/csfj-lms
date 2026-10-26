# Deploying to Render

This repository includes a Render Blueprint in `render.yaml` for the Express API and React frontend. Both services use automatic deploys when changes are pushed to the connected Git branch.

## Before deploying

1. Push this repository to GitHub or GitLab, including the deployment configuration and the backend integration changes you want deployed. Do not commit `.env` files or secrets.
2. Provision a publicly reachable MySQL database with SSL support. Render cannot connect to MySQL running on your development computer. Record its host, port, database name, username, and password.
3. In Render, create a Blueprint from the connected repository and provide `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` when prompted. `DB_PORT` defaults to `3306`; `DB_SSL` is enabled.
4. Confirm the service hosts match the names in `render.yaml`. If Render assigns different hosts, update `FRONTEND_URL` on `csfj-lms-api` and `VITE_API_URL` on `csfj-lms-frontend` to the actual HTTPS service URLs, then redeploy both services.
5. After the API deploys and connects to MySQL, run `npm run migrate:hub-integration` from `backend/` against the same hosted database. This can be done from a shell with the production database environment configured.

The Blueprint generates `SESSION_SECRET` and `HUB_API_KEY`. Keep both private. The API service uses Render's free compute plan to avoid a billing requirement. Free services have an ephemeral filesystem and may sleep when idle, so uploaded learning-material files can be lost on restart or deploy. For persistent uploads, use an object-storage service or upgrade the backend to a paid plan and attach persistent storage. The API health check uses `/api/db-check`, so Render only marks it healthy after the database responds.

## Verify deployment

- Open `https://csfj-lms-api.onrender.com/api/health` and confirm it returns a successful JSON response.
- Open the frontend service URL, sign in, and verify the browser requests go to the API service URL.
- Verify the API service is healthy and `/api/db-check` returns `{ "ok": true }`.