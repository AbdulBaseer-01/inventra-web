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
Access and refresh tokens are stored in HTTP-only cookies. Configure the SMTP
variables before starting the server so account verification and password reset
emails can be delivered.

## Gmail SMTP setup

For Gmail, use an app password instead of your normal Google account password:

1. Sign in to the Google account that will send Inventra emails.
2. Open [Google Account Security](https://myaccount.google.com/security).
3. Enable **2-Step Verification** for the account.
4. Open [App passwords](https://myaccount.google.com/apppasswords).
5. Create an app password, for example with the name `Inventra`.
6. Copy the generated 16-character password into `SMTP_PASS`.
7. Set the SMTP values in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=Inventra <your-account@gmail.com>
```

Do not use your regular Google password, and do not commit `.env` to source
control. Port `587` with `SMTP_SECURE=false` uses STARTTLS and is recommended
for cloud deployments. Port `465` with `SMTP_SECURE=true` uses implicit TLS.
