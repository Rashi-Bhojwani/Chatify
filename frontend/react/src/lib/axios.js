import axios from "axios";

const defaultApiUrl = import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api";

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export const getStoredToken = () => localStorage.getItem("chatify_token");

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem("chatify_token", token);
  } else {
    localStorage.removeItem("chatify_token");
  }
};

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
