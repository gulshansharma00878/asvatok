import { Response, Request } from "express";
import db from "../models";
import commonController from "./common/common.controller";
import codeController from "./service/code.controller";
const fs = require("fs");
// import summary from "../htmls/summary";
// import event from "./service/event";

class userController {
  async registration(req: Request, res: Response) {
    const { email, password, confirmPassword, name, mobile } = req.body;
    try {
      if (confirmPassword == password) {
        await codeController.addUser(
          {
            email,
            password,
            mobile,
            name,
          },
          res
        );
      } else {
        commonController.errorMessage("confirm password does not match", res);
      }
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    try {
      await codeController.login({ email, password }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async kyc(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { name, address, number, id_num, type } = req.body
    try {
      const _a_front = req.body.a_front;
      const _a_back = req.body.a_back;
      const _pan = req.body.pan;
      const _pan_back = req.body.pan_back;
      const _self_pic = req.body.self_pic;
      const _sign = req.body.sign;
      const random_number = commonController.generateOtp()

      let a_front = `kyc/a_front_${userId}_${random_number}.png`;
      const a_front64Data = _a_front.replace(
        /^data:([A-Za-z-+/]+);base64,/,
        ""
      );
      fs.writeFileSync(a_front, a_front64Data, {
        encoding: "base64",
      });
      a_front = "https://asvatok.onrender.com/" + a_front;

      let a_back = `kyc/a_back_${userId}_${random_number}.png`;
      const a_back64Data = _a_back.replace(
        /^data:([A-Za-z-+/]+);base64,/,
        ""
      );
      fs.writeFileSync(a_back, a_back64Data, {
        encoding: "base64",
      });
      a_back = "https://asvatok.onrender.com/" + a_back;

      let pan = `kyc/pan_${userId}_${random_number}.png`;
      const pan64Data = _pan.replace(
        /^data:([A-Za-z-+/]+);base64,/,
        ""
      );
      fs.writeFileSync(pan, pan64Data, {
        encoding: "base64",
      });
      pan = "https://asvatok.onrender.com/" + pan;

      let pan_back = `kyc/pan_back_${userId}_${random_number}.png`;
      const pan_back64Data = _pan_back.replace(
        /^data:([A-Za-z-+/]+);base64,/,
        ""
      );
      fs.writeFileSync(pan_back, pan_back64Data, {
        encoding: "base64",
      });
      pan_back = "https://asvatok.onrender.com/" + pan_back;

      let self_pic = `kyc/self_pic_${userId}_${random_number}.png`;
      const self_pic64Data = _self_pic.replace(
        /^data:([A-Za-z-+/]+);base64,/,
        ""
      );
      fs.writeFileSync(self_pic, self_pic64Data, {
        encoding: "base64",
      });
      self_pic = "https://asvatok.onrender.com/" + self_pic;

      let sign = `kyc/sign_${userId}_${random_number}.png`;
      const sign64Data = _sign.replace(
        /^data:([A-Za-z-+/]+);base64,/,
        ""
      );
      fs.writeFileSync(sign, sign64Data, {
        encoding: "base64",
      });
      sign = "https://asvatok.onrender.com/" + sign;

      await codeController.kyc({ userId, name, address, number, id_num, type, a_front, a_back, pan, pan_back, self_pic, sign }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_kyc_status(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await codeController.get_kyc_status({ userId }, res)

    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async resend_email(req: Request, res: Response) {
    const { email } = req.body;
    try {
      await codeController.resend_email({ email }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async add_profile(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { aboutMe, wallet } = req.body;

    try {
      const _image = req.body.pic;
      let pic = ""
      if (_image) {

        let image = `profile/profile_${userId}.png`;
        const image64Data = _image.replace(
          /^data:([A-Za-z-+/]+);base64,/,
          ""
        );
        fs.writeFileSync(image, image64Data, {
          encoding: "base64",
        });
        pic = "https://asvatok.onrender.com/" + image;
      }



      await codeController.add_profile({ userId, aboutMe, wallet, pic }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async edit_profile(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id, aboutMe, wallet, name, } = req.body;
    try {
      const get_data = await db.profiles.findOne({
        where: {
          id
        }
      })
      const _image = req.body.pic;
      let pic = ""
      if (_image) {
        let image = `profile/profile_${userId}.png`;
        const image64Data = _image.replace(
          /^data:([A-Za-z-+/]+);base64,/,
          ""
        );
        fs.writeFileSync(image, image64Data, {
          encoding: "base64",
        });
        pic = "https://asvatok.onrender.com/" + image;
      } else {
        pic = get_data.pic
      }
      await codeController.edit_profile(
        { userId, id, aboutMe, wallet, name, pic },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_profile(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    try {
      await codeController.get_profile(
        { userId },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async change_password(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { oldPassword, password } = req.body;
    try {
      await codeController.change_password(
        { userId, password, oldPassword },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async add_product(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const {
      sku_code,
      name,
      description,
      issue_year,
      item_condition,
      category,
      varities,
      city,
      ruler,
      denomination,
      signatory,
      rarity,
      specification,
      metal,
      remarks,
      quantity,
      custom_url,
      video,
      current_price,
      initial_price,
      note,
      sold,
      type_series,
      instock,
      keyword,
      hidden,
      cover_pic,contactNumber,currentQuantity,
      img // Accept the images array from the request body
    } = req.body;

    try {
      const imageUrls: string[] = [];
      const random_number = commonController.generateOtp();

      // Process the images array
      for (let i = 0; i < 5; i++) {
        const _image = img[i];
        if (_image) {
          const imageFilename = `productimage/image${i + 1}_${userId}_${random_number}.png`;
          const image64Data = _image.replace(/^data:([A-Za-z-+/]+);base64,/, "");
          fs.writeFileSync(imageFilename, image64Data, { encoding: "base64" });
          imageUrls.push(`https://asvatok.onrender.com/${imageFilename}`);
        } else {
          imageUrls.push(""); // Push an empty string if the image is not present
        }
      }
    

      let videoUrl = "";
      if (video) {
        const videoFilename = `productvideo/video_${userId}_${random_number}.mp4`;
        const videoBase64Data = video.replace(/^data:([A-Za-z-+/]+);base64,/, "");
        fs.writeFileSync(videoFilename, videoBase64Data, { encoding: "base64" });
        videoUrl = `https://asvatok.onrender.com/${videoFilename}`;
      }

      let cover_pic_ = "";
      if (cover_pic) {
        const coverFilename = `productimage/cover_pic_${userId}_${random_number}.png`;
        const coverBase64Data = cover_pic.replace(/^data:([A-Za-z-+/]+);base64,/, "");
        fs.writeFileSync(coverFilename, coverBase64Data, { encoding: "base64" });
        cover_pic_ = `https://asvatok.onrender.com/${coverFilename}`;
      }

      await codeController.add_product({
        userId,
        sku_code,
        name,
        description,
        issue_year,
        item_condition,
        category,
        varities,
        city,
        ruler,
        denomination,
        signatory,
        rarity,
        specification,
        metal,
        remarks,
        quantity,
        custom_url,
        video: videoUrl,
        current_price,
        initial_price,
        note,
        sold,
        type_series,
        instock,
        keyword,
        hidden,
        images: imageUrls, // Use the processed image URLs
        cover_pic: cover_pic_,contactNumber,currentQuantity
      }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_product(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { page } = req.body;
    try {
      await codeController.get_product(
        { userId, page},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_product_by_id(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body
    try {
      await codeController.get_product_by_id(
        { userId,id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_product_by_user(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { page } = req.body;
    try {
      await codeController.get_product_by_user(
        { userId, page},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async buy_request(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { product_id, amount } = req.body;
    try {
      await codeController.buy_request(
        { userId, product_id, amount },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async bulk_product_data(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const filePath = (req as any).file.path;
    try {
      await codeController.bulk_product_data(
        { filePath },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async add_wallet_order(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {amount} = req.body;

    try {
      await codeController.add_wallet_order(
        { userId,amount  },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_wallet_balance(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    try {
      await codeController.get_wallet_balance(
        { userId },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }



  async get_categories(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    try {
      await codeController.get_categories(
        { userId },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_all_categories_public(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { page } = req.body;
    try {
      await codeController.get_all_categories_public(
        { userId, page },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }
  

  async get_category_by_id(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id} = req.body

    try {
      await codeController.get_category_by_id(
        { userId,id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async add_category(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {catName, details, image} = req.body
    const random_number = commonController.generateOtp();

    let cover_pic_ = "";
    if (image) {
      const coverFilename = `productimage/categoryImage_${userId}_${random_number}.png`;
      const coverBase64Data = image.replace(/^data:([A-Za-z-+/]+);base64,/, "");
      fs.writeFileSync(coverFilename, coverBase64Data, { encoding: "base64" });
      cover_pic_ = `https://asvatok.onrender.com/${coverFilename}`;
    }
    try {
      await codeController.add_category(
        { userId,catName, details, image:cover_pic_ },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async purchase_history(req: Request, res: Response) {
    const userId = (req as any).user?.id;

    try {
      await codeController.purchase_history(
        { userId },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }
  

  async all_products_public(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { page } = req.body;
    try {
      await codeController.all_products_public(
        { userId, page},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_buy_requests(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    // const {id}= req.body
    try {
      await codeController.get_buy_requests(
        { userId },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_product_by_cat(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    try {
      await codeController.get_product_by_cat(
        { userId},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async razor_verify_auth(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id, razorpay_payment_id, razorpay_order_id, razorpay_signature}= req.body

    try {
      await codeController.razor_verify_auth(
        { userId,razorpay_payment_id, razorpay_order_id, razorpay_signature},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_products_by_cat_id(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body

    try {
      await codeController.get_products_by_cat_id(
        { userId, id},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async top_gainers(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    // const {id}= req.body

    try {
      await codeController.top_gainers(
        { userId},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  } 
  
  async top_losers(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    // const {id}= req.body

    try {
      await codeController.top_losers(
        { userId},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async createArticle(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {title, writer, timestamp, category, content, cover_image}= req.body

    try {
      await codeController.createArticle(
        { userId, title, writer, timestamp, category, content, cover_image},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async getAllNonActiveArticles(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    // const {id}= req.body

    try {
      await codeController.getAllNonActiveArticles(
        { userId},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async getArticleById(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body

    try {
      await codeController.getArticleById(
        { userId, id},
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async updateArticle(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id, title, writer, timestamp, category, content, cover_image, }= req.body

    try {
      await codeController.updateArticle(
        { userId , id, title, writer, timestamp, category, content, cover_image, },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async deleteArticle(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body

    try {
      await codeController.deleteArticle(
        { userId, id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }
 
  async sell_trade(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {quantity,product_id,amount}= req.body

    try {
      await codeController.sell_trade(
        { userId,quantity,product_id,amount },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }


  async buy_trade(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {quantity,product_id,amount}= req.body

    try {
      await codeController.buy_trade(
        { userId,quantity,product_id,amount },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }
}

export default new userController();
