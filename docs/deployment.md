## Deployment Guide (AWS / GCP)

This backend is stateless and can be deployed as a Node service or Docker container. MongoDB is expected to be provided by a managed service (e.g., MongoDB Atlas).

### Common Prerequisites

- **MongoDB** connection string (e.g., MongoDB Atlas)
- **Firebase Admin** service account values:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- **Razorpay** credentials:
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
- Proper **CORS origins** for your React web and React Native app backends.

### Docker Image (recommended for both AWS/GCP)

1. **Dockerfile (example)**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./ 
RUN npm install --omit=dev
COPY backend/src ./src
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
```

2. **Build & push image**

```bash
docker build -t mapsmyway-backend .
# Tag & push to ECR (AWS) or Artifact Registry (GCP)
```

3. **Environment variables**

Configure all `.env` keys as environment variables in your platform (never bake secrets into images).

---

### AWS Options

#### AWS Elastic Beanstalk (EC2)

1. Create a new Node.js Elastic Beanstalk application.
2. Deploy the code or Docker image.
3. Set environment variables in **Configuration → Software**.
4. Configure:
   - Health checks (`/api/auth/me` for authenticated or a simple `/health` endpoint if added).
   - Load balancer HTTPS (ACM certificate).
5. Store MongoDB credentials and Firebase/Razorpay secrets in **SSM Parameter Store** or **Secrets Manager**.

#### AWS ECS (Fargate)

1. Push Docker image to **ECR**.
2. Create a **Task Definition** referencing the image.
3. Define container environment variables (from **SSM** / **Secrets Manager**).
4. Create a **Service** with:
   - Fargate launch type
   - Load balancer with HTTPS listener
5. Point your domain to the ALB via Route 53.

---

### GCP Options

#### Cloud Run (recommended)

1. Push Docker image to **Artifact Registry**.
2. Create a new Cloud Run service from the image.
3. Configure:
   - Min/max instances
   - Concurrency
   - Environment variables (MongoDB, Firebase, Razorpay, CORS, etc.)
4. Enable HTTPS (Cloud Run provides HTTPS URLs by default).
5. Map a custom domain via Cloud Run domain mapping if needed.

#### App Engine (Flex)

1. Create `app.yaml` pointing to the Docker image or Node service.
2. Deploy using `gcloud app deploy`.
3. Configure environment variables in `app.yaml` or via GCP console.

---

### Security Checklist

- Use **HTTPS** everywhere (ALB/Cloud Run).
- Store secrets in **SSM/Secrets Manager** (AWS) or **Secret Manager** (GCP).
- Restrict CORS to your known frontends via `CORS_ORIGINS`.
- Configure **Razorpay webhook URL** to `/api/payments/webhook` with:
  - Secret = `RAZORPAY_WEBHOOK_SECRET`
  - HTTPS-only URL
- Ensure MongoDB IP allowlist includes only your cloud network / VPC or use VPC peering.

---

### Scaling & Monitoring

- Horizontal scaling:
  - AWS: Auto Scaling Groups (EC2) or ECS Service autoscaling.
  - GCP: Cloud Run automatic scaling.
- Monitoring:
  - Expose application logs (Winston logs to stdout) and collect with:
    - CloudWatch Logs (AWS)
    - Cloud Logging (GCP)
- Use health checks and alarms on 5xx rates and latency.

