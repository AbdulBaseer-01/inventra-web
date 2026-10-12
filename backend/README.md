# Inventra backend

This backend uses Express, MongoDB/Mongoose, JWT cookies, and SMTP email delivery.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGO_URI` to a reachable MongoDB deployment. The database name in the URI
   should be `storedata`, for example:
   `mongodb://127.0.0.1:27017/storedata`
3. Set long, unique values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
4. Run `npm install`.
5. Start development with `npm run dev`, or production with `npm start`.

The server listens on `PORT` (default `5000`) and allows the frontend at `CLIENT_URL`.

## Authentication endpoints

- `POST /api/auth/signup`
- `POST /api/auth/register-store`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/auth/verify-email/:token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
Access and refresh tokens are stored in HTTP-only cookies. Configure `EMAIL_USER`
and `EMAIL_PASS` before starting the server so account verification and password
reset emails can be delivered.
