import { verify } from "crypto";
import express from "express";
import userController from "../controllers/user.controller";

const router = express.Router();

router.post("/registration", userController.registration);
router.post("/resend_email", userController.resend_email);
router.post("/login", userController.login);



export default router;
