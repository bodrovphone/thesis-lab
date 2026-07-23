# Backend

NestJS API for Thesis Lab (Prisma + PostgreSQL).

**Local setup and monorepo commands:** see the [repository root README](../README.md#development).

Run from the repo root:

```bash
npm run start:dev --workspace backend
```

Health check when the app and database are up: http://localhost:3001/health

Production deployment: https://thesis-lab-backend-s8dj.onrender.com

Production health check: https://thesis-lab-backend-s8dj.onrender.com/health

### Auth & CORS (intentional scope)

- **No auth** — this is a single-user research demo. Write endpoints are open by design; do not treat the deployed API as a multi-tenant boundary.
- **CORS** — optional via `CORS_ORIGIN` (comma-separated). The Next.js app calls the backend from server-side route handlers, so CORS is not required for the normal UI path. Shared bootstrap (`configureApp`) applies the same `ValidationPipe` + CORS rules in production and e2e.
