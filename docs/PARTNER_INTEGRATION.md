# Partner Integration Guide

## Goal

Consume live apartment data from your wrapper API using partner credentials.

## What You Share with Partner

- Base URL (for example `https://api.your-domain.com`)
- `token`
- `secret`
- Signature rules
- Endpoint path: `GET /apartments`

## Request Contract

Headers:

- `x-api-token`
- `x-api-timestamp`
- `x-api-signature`

Signature base string:

```text
{timestamp}.{METHOD}.{PATH}.{rawBody}
```

For this integration:

- `METHOD = GET`
- `PATH = /apartments`
- `rawBody = ""`

## Recommended Client Behavior

1. Generate timestamp just before request.
2. Generate signature with current timestamp.
3. Retry on `409` with exponential backoff.
4. Alert on repeated `401` or `500`.
5. Keep clocks synchronized (NTP).

## Pseudocode

```text
timestamp = unix_seconds_now()
base = timestamp + ".GET./apartments."
signature = hmac_sha256_hex(secret, base)

GET /apartments
  x-api-token: token
  x-api-timestamp: timestamp
  x-api-signature: signature
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
  - wrong signature base string
  - timestamp skew too large
- `409 Conflict`:
  - another sync in progress; retry after short delay
- `500 LiveFetchFailed`:
  - temporary upstream issue; retry and alert

## Rotation Policy

- Rotate partner secret periodically.
- Rotate immediately if leaked.
- Keep old/new keys during a migration window if needed.
