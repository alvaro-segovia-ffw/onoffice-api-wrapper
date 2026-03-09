# Partner Integration Guide

## Goal

Consume live apartment data from your wrapper API using partner credentials.

## What You Share with Partner

- Base URL (for example `https://api.your-domain.com`)
- `token`
- `secret`
- Endpoint path: `GET /apartments`

## Request Contract

Headers:

- `x-api-token`
- `x-api-secret`

## Recommended Client Behavior

1. Send `token` and `secret` as headers.
2. Retry on `409` with exponential backoff.
3. Alert on repeated `401` or `500`.

## Pseudocode

```text
GET /apartments
  x-api-token: token
  x-api-secret: secret
```

## Response Handling

- Use `apartments` array as source payload.
- Use `meta` fields for monitoring and logging:
  - `count`
  - `durationMs`
  - `startedAt`
  - `finishedAt`

## Common Errors

- `401 Unauthorized`:
  - wrong token/secret
- `409 Conflict`:
  - another sync in progress; retry after short delay
- `500 LiveFetchFailed`:
  - temporary upstream issue; retry and alert

## Rotation Policy

- Rotate partner secret periodically.
- Rotate immediately if leaked.
- Keep old/new keys during a migration window if needed.
