// const express = require ('express');

import express from  'express';
import dotenv from 'dotenv';
import authRouters from "./routes/auth.route.js";
import messageRouters from "./routes/message.auth.js";
import { connectDB } from './lib/db.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json())

app.use("/api/auth" , authRouters);
app.use("/api/messages" , messageRouters);

app.listen(PORT , () => {
    console.log("Server Running on port : "+ PORT);
    connectDB();
});