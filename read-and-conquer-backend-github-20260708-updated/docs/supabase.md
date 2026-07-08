# Supabase Setup

This backend uses Supabase as PostgreSQL and Prisma as the ORM.

## 1. Create a Prisma database user in Supabase

Open Supabase SQL Editor and run:

```sql
create user "prisma" with password 'replace_with_strong_password' bypassrls createdb;
grant "prisma" to "postgres";

grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;

alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

## 2. Configure `.env`

Use Supabase Dashboard > Connect.

```env
DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"
```

- `DATABASE_URL`: pooled URL for the running NestJS app.
- `DIRECT_URL`: direct/session URL for Prisma migrations.

## 3. Apply schema

For a hackathon/demo database:

```bash
npm run prisma:push
npm run prisma:seed
```

For migration-based workflow:

```bash
npm run prisma:migrate
npm run prisma:seed
```

For production deployment:

```bash
npm run prisma:deploy
```

## 4. Start the backend

```bash
npm run start:dev
```
