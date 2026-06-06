import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";
import { getBearerToken } from "../lib/utils.js";

const getCookieToken = (cookieHeader = "") => {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const jwtCookie = cookies.find((cookie) => cookie.startsWith("jwt="));
  return jwtCookie ? decodeURIComponent(jwtCookie.split("=").slice(1).join("=")) : null;
};

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      getBearerToken(socket.handshake.headers.authorization) ||
      getCookieToken(socket.handshake.headers.cookie);

    if (!token) {
      console.log("Socket connection rejected: No token provided");
      return next(new Error("Unauthorized - No Token Provided"));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded?.userId) {
      console.log("Socket connection rejected: Invalid token");
      return next(new Error("Unauthorized - Invalid Token"));
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      console.log("Socket connection rejected: User not found");
      return next(new Error("User not found"));
    }

    socket.user = user;
    socket.userId = user._id.toString();

    console.log(`Socket authenticated for user: ${user.fullName} (${user._id})`);

    next();
  } catch (error) {
    console.log("Error in socket authentication:", error.message);
    next(new Error("Unauthorized - Authentication failed"));
  }
};
