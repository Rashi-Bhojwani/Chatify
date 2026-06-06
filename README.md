# Chatify

Chatify is a full-stack real-time chat app with a Node.js/Express + Socket.IO backend, a React/Vite frontend, and MongoDB Atlas for cloud data storage.

## Current deployment approach

This repository is configured for a simple AWS deployment **without buying a domain first**:

- **MongoDB is cloud-only from the start**: use a MongoDB Atlas connection string for `MONGO_URI`.
- **Backend and frontend run behind one EC2 public DNS/IP**: Nginx serves the React build and proxies `/api` plus `/socket.io` to the Node backend.
- **No frontend environment variables are required for the first AWS deployment**: the production frontend defaults to same-origin `/api` and the current browser origin for Socket.IO.
- **Only two backend environment variables are required**: `MONGO_URI` and `JWT_SECRET`.

See [`deployment-steps.md`](deployment-steps.md) for the full AWS deployment guide from zero.

## Required backend environment variables

Create `backend/.env` from `backend/.env.example` and set:

```bash
MONGO_URI=mongodb+srv://<atlas-user>:<atlas-password>@<atlas-cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<generate-a-long-random-secret>
```

Everything else is optional for the no-domain AWS deployment.

## Optional integrations

These can stay blank until you need them:

- `CLOUDINARY_*` for profile/message image uploads.
- `RESEND_API_KEY` and email sender settings for welcome emails.
- `ARCJET_KEY` for abuse/rate protection.
- `CLIENT_URL`/`CLIENT_URLS` only when you want to restrict CORS to specific origins, usually after adding a domain or splitting frontend/backend hosts.

## Local development note

The app can still be run locally for development, but production data should use MongoDB Atlas rather than a local MongoDB server.

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend/react
npm install
npm run dev
```

## Production build check

```bash
cd frontend/react
npm run build
```
