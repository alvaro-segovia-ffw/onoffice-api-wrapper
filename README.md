# onoffice-test

Script en Node.js para exportar apartamentos desde onOffice con toda su información y sus imágenes relacionadas en un único archivo JSON.

## Requisitos

- Node.js 18+ (incluye `fetch` nativo)
- Credenciales de onOffice (`TOKEN` y `SECRET`)

## Instalación

```bash
npm install
```

## Configuración

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales:

```env
ONOFFICE_URL=https://api.onoffice.de/api/stable/api.php
ONOFFICE_TOKEN=tu_token
ONOFFICE_SECRET=tu_secret
```

## Uso

```bash
node export-apartments.js
```

## Salida

El script genera un archivo con fecha y hora en el nombre:

- `export_YYYY-MM-DD_HH-mm-ss.json`

Cada apartamento incluye:

- Datos generales (`id`, dirección, habitaciones, rentas, etc.)
- `photos`: lista de imágenes relacionadas con metadatos (`url`, `type`, `title`, `originalname`, `modified`)

Ejemplo simplificado:

```json
[
  {
    "id": "12345",
    "address": {
      "streetName": "Main St",
      "city": "Berlin"
    },
    "rent": {
      "warmRent": 1200,
      "coldRent": 980,
      "currency": "EUR"
    },
    "photos": [
      {
        "url": "https://...",
        "type": "Foto",
        "title": "Living room"
      }
    ]
  }
]
```

## Seguridad

- `.env` está ignorado en `.gitignore` para no subir credenciales.
