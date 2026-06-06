import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouters from "./routes/auth.route.js";
import messageRouters from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV, isOriginAllowed, validateEnv } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const PORT = ENV.PORT;

validateEnv();

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "chatify-api" });
});

app.use("/api/auth", authRouters);
app.use("/api/messages", messageRouters);

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
  });
};

startServer();
