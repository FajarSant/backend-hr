# Backend HR - Auth + Verifikasi Wajah

Project ini menggunakan NestJS + Prisma.

## Setup

```bash
npm install
npm run prisma:generate
```

## Menjalankan project

```bash
npm run start:dev
```

## Endpoint Auth

### 1) Register
`POST /auth/register`

```json
{
  "fullName": "Budi Santoso",
  "email": "budi@mail.com",
  "password": "rahasia123",
  "faceEmbedding": [0.11, 0.22, 0.33]
}
```

Response: data user + `accessToken`.

### 2) Login
`POST /auth/login`

```json
{
  "email": "budi@mail.com",
  "password": "rahasia123"
}
```

Response: data user + `accessToken`.

### 3) Verifikasi wajah
`POST /auth/face-verify`

Header:
`Authorization: Bearer <accessToken>`

Body:

```json
{
  "faceEmbedding": [0.1, 0.2, 0.31]
}
```

Response:

```json
{
  "verified": true,
  "distance": 0.01,
  "threshold": 0.6
}
```

### 4) Cek user saat ini
`GET /auth/me`

Header:
`Authorization: Bearer <accessToken>`

## Testing (siap diuji)

### Lint
```bash
npm run lint
npm run lint:fix
```

### Unit Test
```bash
npm run test
```

### E2E Test
E2E di project ini menggunakan mock Prisma provider sehingga bisa jalan tanpa koneksi database.

```bash
npm run test:e2e
```

### Full Check (generate client + lint + build + unit + e2e)

```bash
npm run check
```
