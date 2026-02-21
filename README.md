# Growth Chart Clinic

Web app for pediatric growth chart tracking, chart visualization, and printable reports.

## License

- Source code: `LICENSE`
- Third-party notices: `THIRD_PARTY_NOTICES.md`

## Local Development

Prerequisites:
- Node.js 18+
- npm 9+

Install and run:

```bash
npm install
npm start
```

Production build:

```bash
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` if you need to override defaults:

```bash
cp .env.example .env
```

Available variables:
- `REACT_APP_CALIBRATION_MODE` (`true` or `false`) - enables calibration view helpers.

## Push This Project to GitHub

Run from the project root (`/mnt/c/Users/Alexa/OneDrive/Desktop/Growth Chart`):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If this repo is already initialized and you only need to push updates:

```bash
git add .
git commit -m "Prepare project for deployment"
git push
```

## Deploy to Vercel

This repository includes `vercel.json` with SPA rewrites so React Router routes (for example `/patients/123`) work on refresh.

### Option 1: Vercel Dashboard (recommended)

1. Go to Vercel and click **Add New Project**.
2. Import your GitHub repository.
3. Framework preset should auto-detect as **Create React App**.
4. Build command: `npm run build`
5. Output directory: `build`
6. Add environment variables if needed (`REACT_APP_CALIBRATION_MODE`).
7. Deploy.

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## Recommended Post-Deploy Checks

- Open `/patients` directly and refresh the page (should not 404).
- Open one dynamic patient route like `/patients/<id>`.
- Confirm chart rendering and print view load correctly.
