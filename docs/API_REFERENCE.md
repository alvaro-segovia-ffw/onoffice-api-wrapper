# API Reference

## Base URL

Development default:

```text
http://localhost:3000
```

Production example:

```text
https://api.your-domain.com
```

## Authentication

All protected requests require:

- `x-api-token`
- `x-api-timestamp`
- `x-api-signature`

Signature format:

```text
signature = HMAC_SHA256_HEX(secret, "{timestamp}.{METHOD}.{PATH}.{rawBody}")
```

For `GET /apartments`:

- `METHOD = GET`
- `PATH = /apartments`
- `rawBody = ""`

## Endpoints

### `GET /apartments`

Protected endpoint. Performs a live sync from onOffice and returns normalized apartments JSON.

#### Headers

- `x-api-token`: partner token
- `x-api-timestamp`: Unix timestamp in seconds
- `x-api-signature`: HMAC signature in hex

#### Success Response `200`

```json
{
  "apartments": [],
  "meta": {
    "requestedBy": "partner-a",
    "count": 84,
    "startedAt": "2026-03-06T10:00:00.000Z",
    "finishedAt": "2026-03-06T10:00:03.000Z",
    "durationMs": 3000
  }
}
```

#### Error `401 Unauthorized`

```json
{
  "error": "Unauthorized",
  "message": "Invalid signature."
}
```

#### Error `409 Conflict`

```json
{
  "error": "Conflict",
  "message": "Another live onOffice sync is already running."
}
```

#### Error `500 LiveFetchFailed`

```json
{
  "error": "LiveFetchFailed",
  "message": "..."
}
```

### `GET /playground`

Unprotected local test UI.

## Example Request (bash)

```bash
TOKEN="partner_token"
SECRET="partner_secret"
TS="$(date +%s)"
METHOD="GET"
PATH="/apartments"
BODY=""
BASE="${TS}.${METHOD}.${PATH}.${BODY}"
SIG="$(printf '%s' "$BASE" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')"

curl -X GET "http://localhost:3000${PATH}" \
  -H "x-api-token: ${TOKEN}" \
  -H "x-api-timestamp: ${TS}" \
  -H "x-api-signature: ${SIG}"
```
