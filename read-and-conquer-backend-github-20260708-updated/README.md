# Read & Conquer Backend

NestJS + Prisma + PostgreSQL backend for a location-based gamified reading app.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Required external API environment variables:

```env
DATABASE_URL=
DIRECT_URL=
LIBRARY_API_KEY=
KAKAO_REST_API_KEY=
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Supabase setup details are in [docs/supabase.md](docs/supabase.md).
Current API specification is in [docs/api-spec.md](docs/api-spec.md).
REST Client examples are in [docs/api-examples.http](docs/api-examples.http).
Territory rules are documented in [docs/territory-rules.md](docs/territory-rules.md).

## Implemented APIs

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/signup`
- `POST /api/users/profile`
- `GET /api/users/me`
- `GET /api/users/check-nickname`
- `GET /api/users/me/books`
- `GET /api/users/me/sessions`
- `GET /api/users/me/libraries`
- `GET /api/factions`
- `POST /api/factions`
- `GET /api/libraries`
- `GET /api/libraries/nationwide`
- `GET /api/libraries/nearby/search`
- `GET /api/libraries/geocode`
- `GET /api/libraries/:id`
- `POST /api/libraries/sync`
- `GET /api/books`
- `GET /api/books/isbn/:isbn`
- `GET /api/books/isbn/:isbn/exist`
- `GET /api/books/recommendations`
- `POST /api/sessions/start`
- `POST /api/sessions/ping`
- `POST /api/sessions/:sessionId/submit`
- `POST /api/sessions/:sessionId/complete`
- `POST /api/sessions/complete`
- `POST /api/verify/vision`
- `POST /api/verify/llm`
- `GET /api/verify/:sessionId`
- `GET /api/ranking/factions`
- `GET /api/ranking/users`

External API integration points:

- Google OAuth: exchanges authorization code and issues service JWT.
- Library Info API: resolves ISBN metadata and can sync library records.
- Kakao Local API: geocodes library addresses and caches nearby library search results.
- Gemini API: validates cover image and review text, with deterministic fallback when `GEMINI_API_KEY` is absent.
