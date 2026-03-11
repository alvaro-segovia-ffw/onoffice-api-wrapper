# Deployment Guide

## Target

Deploy the API on Railway behind Railway's managed HTTPS endpoint or a custom domain.

## Prerequisites

- A Railway account
- This repository connected to a Railway project
- Valid onOffice credentials
- At least one partner user configured

## Required Environment Variables

Set these in Railway's service variables:

```env
NODE_ENV=production
ONOFFICE_TOKEN=your_onoffice_token
ONOFFICE_SECRET=your_onoffice_secret
EXPORT_API_USERS=[{"id":"partner-a","token":"partner_token","secret":"partner_secret"}]
```

Optional variables:

```env
ONOFFICE_URL=https://api.onoffice.de/api/stable/api.php
EXPORT_API_ENABLE_PLAYGROUND=false
EXPORT_API_RATE_LIMIT_ENABLED=true
EXPORT_API_RATE_LIMIT_WINDOW_SEC=60
EXPORT_API_RATE_LIMIT_MAX_REQUESTS=60
```

Notes:

- Do not upload your local `.env` to Railway.
- `PORT` is injected by Railway automatically and is used by the app.

## Deploy Steps

1. Create a new Railway project.
2. Connect this repository.
3. Add the required environment variables.
4. Deploy the service.

Railway will install dependencies and run:

```bash
npm start
```

## Post-Deploy Checks

- `GET /health` returns `200`
- `GET /docs` loads Swagger UI
- `GET /apartments` succeeds with a configured partner token/secret
- `/playground` is disabled in production unless you explicitly enable it

## Custom Domain

If you want a branded URL such as `api.example.com`, add it in Railway's domain settings and update partner integrations to use that base URL.
