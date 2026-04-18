import express from "express";

const router = express.Router();

router.get("/signup", (req,res) => {
    res.send("Signup Endpoint");
})

router.get("/login", (req,res) => {
    res.send("login Endpoint");
})

router.get("/logout", (req,res) => {
    res.send("logout Endpoint");
})


export default router;