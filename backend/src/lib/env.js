import dotenv from "dotenv";

dotenv.config();

const toArray = (value) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const defaultClientUrl = process.env.NODE_ENV === "production" ? "" : "http://localhost:5173";

export const ENV = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || defaultClientUrl,
  CLIENT_URLS: toArray(process.env.CLIENT_URLS),
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || "onboarding@resend.dev",
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Chatify",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  ARCJET_KEY: process.env.ARCJET_KEY,
  ARCJET_ENV: process.env.ARCJET_ENV,
};

export const isProduction = ENV.NODE_ENV === "production";

export const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

export const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !ENV[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

export const allowedOrigins = [...new Set([ENV.CLIENT_URL, ...ENV.CLIENT_URLS].filter(Boolean))];

export const isOriginAllowed = (origin) => {
  if (!origin) return true;

  // If no client origin is configured, reflect the request origin. This keeps the
  // AWS no-domain deployment simple because the EC2 public DNS/IP is not known
  // until after the instance is created. Set CLIENT_URL/CLIENT_URLS later to
  // lock CORS down to specific frontend origins.
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.includes(origin);
};
