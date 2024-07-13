import { verify } from "crypto";
import express from "express";
import userController from "../controllers/user.controller";
import adminController from "../controllers/admin.controller";
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
router.post("/get_product", userController. get_product);

router.post("/buy_request", userController.buy_request);
router.post("/get_buy_requests",userController.get_buy_requests)

router.post("/bulk_product_data", uploadFile.single("file"),userController.bulk_product_data);

router.post("/add_wallet_order",userController.add_wallet_order)
router.post("/get_wallet_balance",userController.get_wallet_balance)

router.post("/get_product_by_id",userController.get_product_by_id)
router.post("/get_product_by_user",userController.get_product_by_user)


router.post("/get_all_categories",userController.get_categories)
router.post("/add_category",userController.add_category)
router.post("/get_category_by_id",userController.get_category_by_id)
router.post("/purchase_history",userController.purchase_history)

router.post("/razor_verify_auth",userController.razor_verify_auth)

router.post("/get_products_by_cat_id",userController.get_products_by_cat_id)

// admin section
router.post("/approve_buy_request",adminController.approve_buy_request)
router.post("/reject_buy_request",adminController.reject_buy_request)
router.post("/all_buy_requests",adminController.all_buy_requests)
router.post("/add_balance_to_user",adminController.add_balance_to_user)
router.post("/approve_product",adminController.approve_product)
router.post("/get_all_kyc",adminController.get_all_kyc)
router.post("/get_kyc_by_id",adminController.get_kyc_by_id)
router.post("/approve_kyc",adminController.approve_kyc)
router.post("/reject_kyc",adminController.reject_kyc)

router.post("/all_product_admin",adminController.all_product_admin)
router.post("/add_product_admin",adminController.add_product_admin)
router.post("/get_product_admin_by_id",adminController.get_product_admin_by_id)







export default router;
