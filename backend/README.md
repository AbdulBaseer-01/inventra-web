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
Access and refresh tokens are stored in HTTP-only cookies. Configure Resend
before starting the server so account verification and password reset emails
can be delivered.

## Resend setup

1. Create an account at [Resend](https://resend.com/).
2. Open **API Keys** in the Resend dashboard and create an API key.
3. Copy the key immediately; Resend only displays the full key once.
4. Open **Domains**, add a domain you control, and publish the DNS records
   Resend provides. Wait until the domain is marked **Verified**.
5. Set the Render environment variables:

```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM=Inventra <noreply@your-verified-domain.com>
```

`RESEND_FROM` must use the verified domain. During development, Resend may
allow sending only to the email address associated with your Resend account
until a sending domain is verified. Do not commit `.env` or expose
`RESEND_API_KEY` in frontend code.

After setting the variables, redeploy the Render service and test registration
or password reset. The backend uses Resend over HTTPS, so it does not require
outbound SMTP ports such as 465 or 587.
