import express from "express";
import { signup } from "../controllers/auth.controllers.js";

const router = express.Router();

router.post("/signup", signup)

router.get("/login", (req,res) => {
    res.send("login Endpoint");
})

router.get("/logout", (req,res) => {
    res.send("logout Endpoint");
})


export default router;