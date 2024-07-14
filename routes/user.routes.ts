import { verify } from "crypto";
import express from "express";
import userController from "../controllers/user.controller";
import adminController from "../controllers/admin.controller";

const router = express.Router();

router.post("/registration", userController.registration);
router.post("/resend_email", userController.resend_email);
router.post("/login", userController.login);
router.post("/all_products_public",userController.all_products_public)
router.post("/get_all_categories_public",userController.get_all_categories_public)

router.post("/get_products_by_cat_id",userController.get_products_by_cat_id)




export default router;
