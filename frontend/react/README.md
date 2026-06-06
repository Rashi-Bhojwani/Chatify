# Chatify Frontend

This is the React/Vite frontend for Chatify.

## Deployment defaults

For the no-domain AWS EC2 deployment, do **not** set frontend environment variables. The app is built to use same-origin routes in production:

- API requests go to `/api`.
- Socket.IO connects to the current browser origin.

Nginx on EC2 serves this build and proxies `/api` plus `/socket.io` to the backend. That keeps the first AWS deployment working with only an EC2 public IP or public DNS.

## Optional environment variables

Only set these if you later host the frontend and backend on different origins:

```bash
VITE_API_URL=https://<backend-host>/api
VITE_SOCKET_URL=https://<backend-host>
```

## Build

```bash
npm ci
npm run build
```

The production output is written to `dist`.
