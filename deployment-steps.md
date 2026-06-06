# Chatify AWS Deployment Steps (Backend + Frontend)

This guide deploys Chatify from zero on AWS using:

- **Amazon EC2** for the Node.js/Express + Socket.IO backend
- **Amazon S3 + CloudFront** for the Vite React frontend
- **MongoDB Atlas** for the database
- Optional **Cloudinary**, **Resend**, and **Arcjet** integrations

> Replace every placeholder like `<your-domain.com>` with your real value.

---

## 1. Prerequisites

1. Create or have access to:
   - An AWS account
   - A GitHub repository containing this project
   - A MongoDB Atlas account
   - Optional Cloudinary, Resend, and Arcjet accounts
2. Install locally:
   - Git
   - Node.js 20 LTS or newer
   - npm
   - AWS CLI v2
3. Pick domains:
   - Frontend: `https://chat.<your-domain.com>`
   - Backend API/socket: `https://api.<your-domain.com>`

---

## 2. Prepare Production Environment Values

### 2.1 Backend environment variables

Create values based on `backend/.env.example`:

```bash
PORT=3000
NODE_ENV=production
CLIENT_URL=https://chat.<your-domain.com>
CLIENT_URLS=https://<cloudfront-domain-name>
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
JWT_SECRET=<64-plus-character-random-secret>
RESEND_API_KEY=<optional-resend-key>
EMAIL_FROM=<verified-resend-sender>
EMAIL_FROM_NAME=Chatify
CLOUDINARY_CLOUD_NAME=<optional-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<optional-cloudinary-api-key>
CLOUDINARY_API_SECRET=<optional-cloudinary-api-secret>
ARCJET_KEY=<optional-arcjet-key>
ARCJET_ENV=production
```

Generate a strong JWT secret:

```bash
openssl rand -hex 64
```

### 2.2 Frontend environment variables

For the production frontend build:

```bash
VITE_API_URL=https://api.<your-domain.com>/api
VITE_SOCKET_URL=https://api.<your-domain.com>
```

---

## 3. Create MongoDB Atlas Database

1. Sign in to MongoDB Atlas.
2. Create a new project, for example `Chatify`.
3. Create a free or production cluster.
4. Create a database user:
   - Username: `<chatify-user>`
   - Password: a strong generated password
5. Allow network access:
   - For a simple first deployment, add `0.0.0.0/0`.
   - For production hardening, restrict this to your EC2 public IP or VPC egress.
6. Copy the connection string and set it as `MONGO_URI`.
7. Use a database name like `chatify` in the URI.

---

## 4. Deploy Backend on EC2

### 4.1 Launch an EC2 instance

1. Open AWS Console → EC2 → Launch instance.
2. Name: `chatify-backend`.
3. AMI: Ubuntu Server 24.04 LTS.
4. Instance type: `t3.micro` for testing or larger for production.
5. Create or select an SSH key pair.
6. Security group inbound rules:
   - SSH: TCP `22` from your IP only
   - HTTP: TCP `80` from anywhere
   - HTTPS: TCP `443` from anywhere
7. Launch the instance.
8. Allocate and associate an Elastic IP so the backend IP does not change.

### 4.2 Connect to EC2

```bash
ssh -i <key-file.pem> ubuntu@<ec2-elastic-ip>
```

### 4.3 Install system packages

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx curl unzip build-essential
```

### 4.4 Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 4.5 Install PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### 4.6 Clone the repository

```bash
git clone https://github.com/<your-org-or-user>/<your-repo>.git /var/www/chatify
cd /var/www/chatify/backend
npm ci --omit=dev
```

### 4.7 Create backend `.env`

```bash
sudo nano /var/www/chatify/backend/.env
```

Paste the production backend values from section 2.1.

Protect the file:

```bash
sudo chown ubuntu:ubuntu /var/www/chatify/backend/.env
chmod 600 /var/www/chatify/backend/.env
```

### 4.8 Start backend with PM2

```bash
cd /var/www/chatify/backend
pm2 start src/server.js --name chatify-backend
pm2 save
pm2 startup systemd
```

PM2 prints a command beginning with `sudo env PATH=...`; copy and run it.

Check logs:

```bash
pm2 logs chatify-backend
```

### 4.9 Configure Nginx reverse proxy

Create an Nginx site:

```bash
sudo nano /etc/nginx/sites-available/chatify-backend
```

Paste:

```nginx
server {
    listen 80;
    server_name api.<your-domain.com>;

    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Socket.IO websocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/chatify-backend /etc/nginx/sites-enabled/chatify-backend
sudo nginx -t
sudo systemctl reload nginx
```

### 4.10 Point DNS to EC2

In Route 53 or your DNS provider:

- Create an `A` record for `api.<your-domain.com>`.
- Point it to the EC2 Elastic IP.

Wait for DNS propagation.

### 4.11 Add HTTPS with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.<your-domain.com>
```

Choose redirect HTTP to HTTPS when prompted.

Test renewal:

```bash
sudo certbot renew --dry-run
```

### 4.12 Verify backend

```bash
curl https://api.<your-domain.com>/health
```

Expected response:

```json
{"status":"ok","service":"chatify-api"}
```

---

## 5. Deploy Frontend on S3 + CloudFront

### 5.1 Create an S3 bucket

1. Open AWS Console → S3 → Create bucket.
2. Bucket name: `chatify-frontend-<unique-suffix>`.
3. Region: choose the same region you normally use.
4. Keep **Block all public access** enabled.
5. Create the bucket.

### 5.2 Build the frontend locally or in CI

From the repository root:

```bash
cd frontend/react
npm ci
VITE_API_URL=https://api.<your-domain.com>/api VITE_SOCKET_URL=https://api.<your-domain.com> npm run build
```

The build output is `frontend/react/dist`.

### 5.3 Upload build to S3

```bash
aws s3 sync frontend/react/dist s3://chatify-frontend-<unique-suffix> --delete
```

### 5.4 Create CloudFront distribution

1. Open AWS Console → CloudFront → Create distribution.
2. Origin domain: select your S3 bucket.
3. Origin access: choose **Origin access control settings**.
4. Create a new Origin Access Control (OAC).
5. Viewer protocol policy: **Redirect HTTP to HTTPS**.
6. Allowed HTTP methods: `GET, HEAD`.
7. Default root object: `index.html`.
8. Create distribution.
9. After creation, CloudFront shows a banner/policy for S3 bucket access. Copy and apply that bucket policy to the S3 bucket permissions.

### 5.5 Configure SPA fallback

In the CloudFront distribution:

1. Open Error pages.
2. Create custom error response:
   - HTTP error code: `403`
   - Customize error response: Yes
   - Response page path: `/index.html`
   - HTTP response code: `200`
3. Create another custom error response for `404` with the same settings.

### 5.6 Attach custom domain and TLS certificate

1. In AWS Certificate Manager, switch to **us-east-1**.
2. Request a public certificate for `chat.<your-domain.com>`.
3. Validate it with DNS.
4. Edit the CloudFront distribution:
   - Alternate domain name: `chat.<your-domain.com>`
   - Custom SSL certificate: choose the ACM certificate
5. Save changes.

### 5.7 Point DNS to CloudFront

In Route 53 or your DNS provider:

- Create an `A`/Alias record for `chat.<your-domain.com>`.
- Point it to the CloudFront distribution.

### 5.8 Update backend CORS

On EC2, update `/var/www/chatify/backend/.env`:

```bash
CLIENT_URL=https://chat.<your-domain.com>
CLIENT_URLS=https://<cloudfront-domain-name>
```

Restart the backend:

```bash
pm2 restart chatify-backend --update-env
```

---

## 6. Smoke Test the Full App

1. Open `https://chat.<your-domain.com>`.
2. Create two accounts in two browsers or profiles.
3. Confirm signup/login works.
4. Confirm the browser receives a `jwt` cookie from `api.<your-domain.com>`.
5. Confirm API requests include either:
   - the secure HTTP-only cookie, and/or
   - `Authorization: Bearer <token>` from the frontend token store.
6. Start a chat and confirm messages appear in real time.
7. Upload an image only after Cloudinary variables are configured.

---

## 7. Updating a Deployment

### Backend update

```bash
ssh -i <key-file.pem> ubuntu@<ec2-elastic-ip>
cd /var/www/chatify
git pull
cd backend
npm ci --omit=dev
pm2 restart chatify-backend --update-env
pm2 logs chatify-backend
```

### Frontend update

```bash
git pull
cd frontend/react
npm ci
VITE_API_URL=https://api.<your-domain.com>/api VITE_SOCKET_URL=https://api.<your-domain.com> npm run build
aws s3 sync dist s3://chatify-frontend-<unique-suffix> --delete
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

---

## 8. Production Hardening Checklist

- Use a long random `JWT_SECRET` and rotate it if it was ever committed or shared.
- Do not commit real `.env` files.
- Restrict EC2 SSH access to your IP.
- Enable CloudWatch logs/alarms for EC2 CPU, memory, disk, and Nginx errors.
- Enable automated EC2 security updates.
- Restrict MongoDB Atlas network access when possible.
- Use verified Resend sender domains for production email.
- Keep Cloudinary upload limits small enough to protect cost and performance.
- Use AWS WAF with CloudFront if the app becomes public/high-traffic.
- Configure regular database backups in MongoDB Atlas.
