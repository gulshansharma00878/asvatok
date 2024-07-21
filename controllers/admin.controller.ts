import { Response, Request } from "express";
import db from "../models";
import commonController from "./common/common.controller";
import codeController from "./service/admin.code.controller";
const fs = require("fs");
// import summary from "../htmls/summary";
// import event from "./service/event";

class userController {
 

  async all_buy_requests(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { page } = req.body;

    try {
      await codeController.all_buy_requests(
        { userId,page },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async approve_buy_request(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.body;
    try {
      await codeController.approve_buy_request(
        { userId, id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }
  
  async reject_buy_request(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id,reason } = req.body;
    try {
      await codeController.reject_buy_request(
        { userId, id, reason },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }


  async add_balance_to_user(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id, amount } = req.body;
    try {
      await codeController.add_balance_to_user(
        { userId, id, amount },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async approve_product(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.body;
    try {
      await codeController.approve_product(
        { userId, id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_all_kyc(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id,page } = req.body;
    try {
      await codeController.get_all_kyc(
        { userId, id,page },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }


  async get_kyc_by_id(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.body;
    try {
      await codeController.get_kyc_by_id(
        { userId, id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async approve_kyc(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id } = req.body;
    try {
      await codeController.approve_kyc(
        { userId, id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async reject_kyc(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id ,reason} = req.body;
    try {
      await codeController.reject_kyc(
        { userId, id, reason },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async all_product_admin(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { page } = req.body;
    try {
      await codeController.all_product_admin(
        { userId, page },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async add_product_admin(req: Request, res: Response) {
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
      cover_pic,contactNumber,
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

      await codeController.add_product_admin({
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
        cover_pic: cover_pic_,contactNumber
      }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_product_admin_by_id(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body
    try {
      await codeController.get_product_admin_by_id(
        { userId,id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async update_product_quantity(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id, quantity}= req.body
    try {
      await codeController.update_product_quantity(
        { userId,id,quantity },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async update_product_price(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id, price}= req.body
    try {
      await codeController.update_product_price(
        { userId,id,price },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_all_users(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body
    try {
      await codeController.get_all_users(
        { userId,id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_user_by_id(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const {id}= req.body
    try {
      await codeController.get_user_by_id(
        { userId,id },
        res
      );
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }
}

export default new userController();
