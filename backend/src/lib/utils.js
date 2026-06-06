import jwt from "jsonwebtoken";
import { ENV, isProduction } from "./env.js";

const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

export const getCookieOptions = () => ({
  maxAge: sevenDaysInMs,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
});

export const getClearCookieOptions = () => ({
  ...getCookieOptions(),
  maxAge: 0,
});

export const generateToken = (userId, res) => {
  const JWT_SECRET = ENV.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, getCookieOptions());

  return token;
};

export const getBearerToken = (authorizationHeader = "") => {
  const [scheme, token] = authorizationHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
};
