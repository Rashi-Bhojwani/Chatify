# Chatify AWS Deployment Guide — No Domain Required, MongoDB Atlas From Start

This guide deploys Chatify on AWS from zero **without a custom domain**. You will use:

- **MongoDB Atlas** for the cloud database from the beginning.
- **One AWS EC2 Ubuntu server** for the backend and frontend.
- **Nginx** on EC2 to serve the React frontend and reverse-proxy backend traffic.
- **PM2** to keep the Node.js backend running.

You do **not** need Route 53, a domain, HTTPS certificates, S3, or CloudFront for this first deployment.

> Final app URL format: `http://<ec2-public-dns>` or `http://<ec2-public-ip>`.

---

## 1. What environment variables are actually required?

For the first no-domain AWS deployment, the backend only requires:

```bash
MONGO_URI=mongodb+srv://<atlas-user>:<atlas-password>@<atlas-cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret>
```

Recommended but optional:

```bash
PORT=3000
NODE_ENV=production
```

Leave these blank unless you later split the frontend/backend onto different origins or add a custom domain:

```bash
CLIENT_URL=
CLIENT_URLS=
```

Leave these blank unless you use the related feature:

```bash
RESEND_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ARCJET_KEY=
```

The frontend needs **no `.env` file** for this no-domain EC2 deployment. In production it automatically calls:

- API: `/api`
- Socket.IO: the same browser origin

That means the browser calls the same EC2 public DNS/IP that served the frontend, and Nginx forwards backend requests internally.

---

## 2. Create MongoDB Atlas cloud database first

Do this before touching AWS so the backend never depends on local MongoDB.

### 2.1 Create an Atlas account and project

1. Go to <https://www.mongodb.com/products/platform/atlas-database>.
2. Sign in or create an account.
3. Create a new project, for example `chatify-production`.

### 2.2 Create a free/shared cluster

1. Click **Build a Database**.
2. Choose the free/shared tier if available.
3. Choose a cloud provider and region close to your AWS EC2 region.
4. Name the cluster, for example `chatify-cluster`.
5. Create the cluster and wait until it is ready.

### 2.3 Create database user

1. Open **Database Access**.
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Username example: `chatify_app`.
5. Generate a strong password and save it.
6. Grant **Read and write to any database** or a scoped read/write role for your Chatify database.

### 2.4 Allow EC2 to connect

For the fastest first deployment:

1. Open **Network Access**.
2. Click **Add IP Address**.
3. Temporarily choose **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Save.

After deployment works, you can tighten this by adding your EC2 Elastic IP only.

### 2.5 Get the Atlas connection string

1. Open **Database** → your cluster → **Connect**.
2. Choose **Drivers**.
3. Copy the connection string.
4. Replace `<password>` with your database user's password.
5. Replace or append the database name, for example `chatify`.

Example shape:

```bash
mongodb+srv://chatify_app:<password>@chatify-cluster.xxxxx.mongodb.net/chatify?retryWrites=true&w=majority
```

This value becomes `MONGO_URI` on EC2.

---

## 3. Create an AWS EC2 server

### 3.1 Launch instance

1. Open the AWS Console.
2. Go to **EC2** → **Instances** → **Launch instances**.
3. Name: `chatify-server`.
4. AMI: **Ubuntu Server 22.04 LTS** or **Ubuntu Server 24.04 LTS**.
5. Instance type: `t2.micro` or `t3.micro` is enough for a small test deployment.
6. Key pair: create or select an existing key pair, for example `chatify-key.pem`.
7. Network settings/security group:
   - Allow SSH `22` from **your IP only**.
   - Allow HTTP `80` from `0.0.0.0/0`.
   - Do **not** expose Node port `3000` publicly.
8. Storage: 20 GB is fine for a small app.
9. Launch instance.

### 3.2 Allocate an Elastic IP

This is optional but recommended so the public IP does not change after stop/start.

1. Go to **EC2** → **Elastic IPs**.
2. Allocate an Elastic IP.
3. Associate it with `chatify-server`.

Your app will be reachable at:

```text
http://<ec2-elastic-ip>
```

or the EC2 public DNS shown on the instance page:

```text
http://ec2-xx-xx-xx-xx.<region>.compute.amazonaws.com
```

---

## 4. Connect to EC2

On your computer:

```bash
chmod 400 <path-to-chatify-key.pem>
ssh -i <path-to-chatify-key.pem> ubuntu@<ec2-public-ip>
```

Update Ubuntu:

```bash
sudo apt update
sudo apt upgrade -y
```

Install useful tools:

```bash
sudo apt install -y git curl unzip nginx build-essential
```

---

## 5. Install Node.js and PM2

Install Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Install PM2 globally:

```bash
sudo npm install -g pm2
pm2 -v
```

---

## 6. Upload or clone the code

Choose one option.

### Option A: clone from GitHub

```bash
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
cd /var/www
git clone <your-repo-url> chatify
cd chatify
```

### Option B: upload from your machine

From your local machine, run:

```bash
rsync -avz --exclude node_modules --exclude .git --exclude backend/.env -e "ssh -i <path-to-chatify-key.pem>" ./ ubuntu@<ec2-public-ip>:/var/www/chatify
```

Then on EC2:

```bash
cd /var/www/chatify
```

---

## 7. Configure backend environment on EC2

Create the backend `.env` file:

```bash
cd /var/www/chatify/backend
nano .env
```

Paste this minimal production config:

```bash
MONGO_URI=mongodb+srv://<atlas-user>:<atlas-password>@<atlas-cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<long-random-secret>
NODE_ENV=production
PORT=3000
```

Generate a safe JWT secret on EC2 if needed:

```bash
openssl rand -base64 64
```

Protect the `.env` file:

```bash
chmod 600 /var/www/chatify/backend/.env
```

Important:

- Do not use `mongodb://localhost:27017/...`.
- Do not commit `.env` to git.
- Keep `CLIENT_URL` and `CLIENT_URLS` unset for this same-origin EC2 deployment.

---

## 8. Install dependencies and build the frontend

### 8.1 Backend dependencies

```bash
cd /var/www/chatify/backend
npm ci --omit=dev
```

### 8.2 Frontend dependencies and build

```bash
cd /var/www/chatify/frontend/react
npm ci
npm run build
```

Do not set `VITE_API_URL` or `VITE_SOCKET_URL` for this no-domain deployment. The production build will use same-origin URLs.

The built files will be in:

```text
/var/www/chatify/frontend/react/dist
```

---

## 9. Start the backend with PM2

```bash
cd /var/www/chatify/backend
pm2 start src/server.js --name chatify-backend
pm2 save
pm2 startup systemd
```

PM2 will print a command starting with `sudo env PATH=...`. Copy that command and run it exactly once.

Check logs:

```bash
pm2 logs chatify-backend
```

A healthy backend should show that it connected to MongoDB Atlas and is running on port `3000`.

---

## 10. Configure Nginx for frontend + backend on one public URL

Create an Nginx config:

```bash
sudo nano /etc/nginx/sites-available/chatify
```

Paste this config:

```nginx
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 8m;

    root /var/www/chatify/frontend/react/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000/socket.io/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the site:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/chatify /etc/nginx/sites-enabled/chatify
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Test the deployment

From your laptop or EC2:

```bash
curl http://<ec2-public-ip>/health
```

Expected response:

```json
{"status":"ok","service":"chatify-api"}
```

Open the app in a browser:

```text
http://<ec2-public-ip>
```

Smoke test:

1. Create account A.
2. Open another browser/profile and create account B.
3. Log in as both users.
4. Send messages between the users.
5. Refresh the browser and confirm you are still authenticated.
6. Open DevTools → Network and confirm API requests go to `/api/...` on the same EC2 origin.
7. Confirm Socket.IO connects to `/socket.io` on the same EC2 origin.

Bearer-token note:

- Login/signup responses include a `token` value.
- The frontend stores it in `localStorage` as `chatify_token`.
- Axios attaches it as `Authorization: Bearer <token>`.
- Socket.IO sends the token through `handshake.auth.token`.
- This is why auth continues to work even on the first HTTP/no-domain deployment where secure cookies are not the primary mechanism.

---

## 12. Updating the app later

On EC2:

```bash
cd /var/www/chatify
git pull

cd backend
npm ci --omit=dev
pm2 restart chatify-backend --update-env

cd ../frontend/react
npm ci
npm run build

sudo nginx -t
sudo systemctl reload nginx
```

Check logs:

```bash
pm2 logs chatify-backend
```

---

## 13. Optional: lock down MongoDB Atlas after EC2 works

If you associated an Elastic IP with EC2:

1. Open MongoDB Atlas → **Network Access**.
2. Add the EC2 Elastic IP as an allowed IP.
3. Remove `0.0.0.0/0`.
4. Restart the backend:

```bash
pm2 restart chatify-backend --update-env
```

---

## 14. Optional: add a domain and HTTPS later

When you buy a domain later:

1. Point an `A` record such as `chat.yourdomain.com` to the EC2 Elastic IP.
2. Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d chat.yourdomain.com
```

3. Edit `backend/.env` and set:

```bash
CLIENT_URL=https://chat.yourdomain.com
```

4. Restart backend:

```bash
pm2 restart chatify-backend --update-env
```

5. Rebuild frontend only if you decide to split API/frontend onto different origins. If still same-origin, no frontend env changes are needed.

---

## 15. Optional services

### Cloudinary image uploads

Set these in `backend/.env` only when you want image uploads:

```bash
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Restart:

```bash
pm2 restart chatify-backend --update-env
```

### Resend welcome emails

Set these only when you want emails:

```bash
RESEND_API_KEY=<resend-key>
EMAIL_FROM=<verified-sender-email>
EMAIL_FROM_NAME=Chatify
```

### Arcjet protection

Set this only when you want Arcjet enabled:

```bash
ARCJET_KEY=<arcjet-key>
ARCJET_ENV=production
```

---

## 16. Troubleshooting

### Backend cannot connect to MongoDB Atlas

Check:

```bash
pm2 logs chatify-backend
```

Common fixes:

- Verify `MONGO_URI` uses `mongodb+srv://` from Atlas.
- Verify the password is URL-encoded if it contains special characters.
- Verify Atlas Network Access allows the EC2 public IP or temporarily `0.0.0.0/0`.
- Verify EC2 outbound internet access is available.

### App loads but API calls fail

Run:

```bash
curl http://127.0.0.1:3000/health
curl http://<ec2-public-ip>/health
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
```

If the first command works but the second fails, the issue is Nginx or the EC2 security group.

### Login works but refresh logs you out

Check browser DevTools → Application → Local Storage:

- Confirm `chatify_token` exists after login.
- Confirm requests include `Authorization: Bearer <token>`.

### Socket does not connect

Check browser DevTools → Network → WS and confirm it connects to:

```text
ws://<ec2-public-ip>/socket.io/...
```

Also confirm the Nginx `/socket.io/` location is present and PM2 logs do not show auth errors.
