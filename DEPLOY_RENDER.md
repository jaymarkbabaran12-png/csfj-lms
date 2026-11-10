# Deploying to Render

This repository includes a Render Blueprint in `render.yaml` for the Express API and React frontend. Both services use automatic deploys when changes are pushed to the connected Git branch.

## Before deploying

1. Push this repository to GitHub or GitLab, including the deployment configuration and the backend integration changes you want deployed. Do not commit `.env` files or secrets.
2. Create a Supabase PostgreSQL project. In its **Connect** dialog, copy the session-pooler URI for IPv4-compatible hosts such as Render. Do not put the database password in source control or chat.
3. In Render, create a Blueprint from the connected repository and set `DATABASE_URL` to that URI. The API applies the idempotent PostgreSQL schema migrations before starting. The legacy `DB_*` settings remain available for local MySQL/MariaDB development when `DATABASE_URL` is unset.
4. Confirm the service hosts match the names in `render.yaml`. If Render assigns different hosts, update `FRONTEND_URL` on `csfj-lms-api` and `VITE_API_URL` on `csfj-lms-frontend` to the actual HTTPS service URLs, then redeploy both services.
5. The migration creates the LMS schema only; it does not copy existing student, account, course, grade, or uploaded-file records. Keep the existing database as a backup and plan any data transfer separately.

The Blueprint generates `SESSION_SECRET` and `HUB_API_KEY`. Keep both private. The API service uses Render's free compute plan to avoid a billing requirement. Free services have an ephemeral filesystem and may sleep when idle, so uploaded learning-material files can be lost on restart or deploy. For persistent uploads, use an object-storage service or upgrade the backend to a paid plan and attach persistent storage. The API health check uses `/api/db-check`, so Render only marks it healthy after the database responds.

## Verify deployment

- Open `https://csfj-lms-api.onrender.com/api/health` and confirm it returns a successful JSON response.
- Open the frontend service URL, sign in, and verify the browser requests go to the API service URL.
- Verify the API service is healthy and `/api/db-check` returns `{ "ok": true }`.
- When deploying login account recovery changes, push them to the branch connected to Render and wait for both services to finish deploying. Then run `npm run setup:login-accounts` from `backend/` against the same production database configured on the API service. The command does not change accounts during deployment; see [Admin and instructor account recovery](./README.md#admin-and-instructor-account-recovery) for the safe interactive setup instructions.