
const Razorpay = require("razorpay")
let crypto = require("crypto")
require('dotenv').config();

const key_id = process.env.RAZORPAY_API_KEY
const key_secret = process.env.RAZORPAY_API_SECRET

async function razor_verify_auth(razorpay_payment_id, razorpay_order_id, razorpay_signature) {
    try {
      // const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = payload
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      console.log(body, "body");
      const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");
      console.log(expectedSignature ," expectedSignature");
      const isAuthentic = expectedSignature === razorpay_signature;
      if (isAuthentic === true) {
        console.log("true");
        
      } else {
        console.log("false");
      }

    } catch (e) {
      console.warn(e, "error");
    }
  }
razor_verify_auth("pay_OaF49fAHk3OS7z","order_OaF43JowwgqsCp",
"58f6cc08306d1c3854dec5ded544cb8bdfb103bdb3b47dbd03f5934db5c1c5ba")

