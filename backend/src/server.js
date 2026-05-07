// const express = require ('express');

import express from  'express';
import authRouters from "./routes/auth.route.js";
import messageRouters from "./routes/message.route.js";
import { connectDB } from './lib/db.js';
import { ENV } from './lib/env.js';
import cookieParser from "cookie-parser"
import cors from "cors";  

const app = express();

const PORT = ENV.PORT || 3000;

app.use(express.json())
app.use(cors({origin:ENV.CLIENT_URL, credentials:true}));
app.use(cookieParser());frontend/public/login.png

app.use("/api/auth" , authRouters);
app.use("/api/messages" , messageRouters);

app.listen(PORT , () => {
    console.log("Server Running on port : "+ PORT);
    connectDB();
});