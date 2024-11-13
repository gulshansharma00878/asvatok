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


router.post("/add_wallet_order",userController.add_wallet_order)
router.post("/get_wallet_balance",userController.get_wallet_balance)

router.post("/get_product_by_id",userController.get_product_by_id)
router.post("/get_product_by_user",userController.get_product_by_user)


router.post("/get_all_categories",userController.get_categories)
router.post("/add_category",userController.add_category)
router.post("/get_category_by_id",userController.get_category_by_id)
router.post("/purchase_history",userController.purchase_history)

router.post("/razor_verify_auth",userController.razor_verify_auth)
router.post("/user_asset_balance",userController.user_asset_balance)

// trade
router.post("/sell_trade",userController.sell_trade)
router.post("/buy_trade",userController.buy_trade)
router.post("/get_trades_by_product_id",userController.get_trades_by_product_id)

// Article 
router.post("/articles/create", userController.createArticle);
router.post("/articles/non-active", userController.getAllNonActiveArticles);
router.post("/articles/active", userController.getAllActiveArticles);

router.post("/articles/delete", userController.deleteArticle);
router.post("/articles/update", userController.updateArticle);

router.post("/search", userController.search);
router.post("/chartdata", userController.chartData);
// asset holders from asset or product id
router.post("/asset_holder_by_product_id", userController.assetHolderByProductId);

router.post("/add_bank_account", userController.addBankAccount);
router.post("/get_user_bank_accounts", userController.getUserBankAcc);
router.post("/add_withdraw_request", userController.addWithdrawRequest);
router.post("/get_user_withdraws", userController.getUserWithdraws);


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

router.post("/update_product_quantity",adminController.update_product_quantity)
router.post("/update_product_price",adminController.update_product_price)

router.post("/all_product_admin",adminController.all_product_admin)
router.post("/update_product_admin",adminController.update_product_admin)
router.post("/get_product_admin_by_id",adminController.get_product_admin_by_id)
router.post("/get_all_users",adminController.get_all_users)
router.post("/get_user_by_id",adminController.get_user_by_id)
router.post("/get_all_trades",adminController.get_all_trades)
router.post("/get_user_assets",adminController.get_user_assets)
router.post("/get_all_transactions",adminController.get_all_transactions)
router.post("/deduct_user_balance",adminController.deductBalance)
router.post("/bulk_product_data", uploadFile.single("file"),adminController.bulk_product_data);
router.post("/admin_dashboard",adminController.adminDashboard)
router.post("/update_fees",adminController.updateFees)

router.post("/all_withdraw_request",adminController.getAllWithdrawReq)
router.post("/approve_withdraw",adminController.approveWithdrawReq)
router.post("/reject_withdraw",adminController.rejectWithdrawReq)


// trade admin

// router.post("/approve_sell_trade",adminController.approve_sell_trade)
// router.post("/reject_sell_trade",adminController.reject_sell_trade)

router.post("/approve_trade",adminController.approve_trade)
router.post("/reject_trade",adminController.reject_trade)


export default router;
