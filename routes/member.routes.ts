import { verify } from "crypto";
import express from "express";
import userController from "../controllers/user.controller";
const bodyParser = require("body-parser");

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, "profile");
  },
  filename: function (req: any, file: any, cb: any) {
    if (file.mimetype === "image/svg+xml") {
      cb(null, file.originalname);
    } else {
      cb(null, file.originalname + ".png");
    }
  },
});

const upload = multer({
  storage: storage,
});

const uploadFile = multer({ dest: 'file/' });

const router = express.Router();

router.use(bodyParser.json({ limit: '100mb' }));
router.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));


router.post("/kyc",userController.kyc);
router.post("/get_kyc_status",userController.get_kyc_status);
router.post("/add_profile",userController.add_profile);
router.post("/edit_profile",userController.edit_profile);
router.post("/get_profile",userController.get_profile);
router.post("/changepassword", userController.change_password);

router.post("/add_product", userController.add_product);
router.post("/get_product", userController.get_product);

router.post("/buy_request", userController.buy_request);
router.post("/bulk_product_data", uploadFile.single("file"),userController.bulk_product_data);




export default router;
