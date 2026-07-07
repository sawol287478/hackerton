# GitHub Upload Checklist

## Commit these files/directories

- `src/`
- `prisma/`
- `docs/`
- `.env.example`
- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `nest-cli.json`
- `tsconfig.json`
- `tsconfig.build.json`

## Do not commit

- `.env`
- `node_modules/`
- `dist/`
- `coverage/`
- `.agents/`
- `.codex/`
- log files such as `npm-debug.log*`

## Before pushing

```bash
npm.cmd test
npm run build
```

## First push example

```bash
git init
git add .
git commit -m "Initial Read and Conquer backend"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

## Notes

- Real API keys must stay only in `.env` or deployment secrets.
- GitHub should only receive `.env.example`.
- Supabase connection setup is documented in `docs/supabase.md`.
