// const express = require ('express');

import express from  'express';
import cookieParser from "cookie-parser"
import cors from "cors";  
import authRouters from "./routes/auth.route.js";
import messageRouters from "./routes/message.route.js";
import { connectDB } from './lib/db.js';
import { ENV } from './lib/env.js';
import { app, server } from './lib/socket.js';

const PORT = ENV.PORT || 3000;

app.use(express.json({limit : "5mb"}));
app.use(cors({origin:ENV.CLIENT_URL, credentials:true}));
app.use(cookieParser());

app.use("/api/auth" , authRouters);
app.use("/api/messages" , messageRouters);

server.listen(PORT , () => {
    console.log("Server Running on port : "+ PORT);
    connectDB();
});