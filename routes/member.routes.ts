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

const storageCc = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, "kyc");
  },
  filename: function (req: any, file: any, cb: any) {
    const userId = req.user.id; //
    console.log(userId);
    cb(null, `${file.fieldname}_${userId}.png`);
  },
});

const upload_kyc = multer({
  storage: storageCc,
});

const router = express.Router();

router.use(bodyParser.json({ limit: '100mb' }));
router.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
const cpUpload = upload_kyc.fields([
  { name: "a_front", maxCount: 1 },
  { name: "a_back", maxCount: 1 },
  { name: "pan", maxCount: 1 },
  { name: "sign", maxCount: 1 },
]);
router.post("/kyc", cpUpload,userController.kyc);
router.post("/changepassword", userController.change_password);



export default router;
