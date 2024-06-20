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
    const { userId } = (req as any).user.id;
    const files = (req as any)?.files;
    const { name, address, number, id_num, type } = req.body
    try {
      const _a_front = req.body.a_front;
      const _a_back = req.body.a_back;
      const _pan = req.body.a_front;
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
    const files = (req as any)?.files;

    try {
      let pic = files.pic[0].path;
      pic = "https://asvatok.onrender.com/" + pic;

      await codeController.add_profile({ userId, aboutMe, wallet, pic }, res);
    } catch (e) {
      console.warn(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async edit_profile(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const { id, aboutMe, wallet, name } = req.body;
    const { files } = (req as any)?.files;
    try {
      const get_data = await db.profiles.findOne({
        where: {
          id
        }
      })
      let pic = files.pic[0].path;
      if (pic) {
        pic = "https://asvatok.onrender.com/" + pic;
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
    const { oldPassword, password } = req.body;
    try {
      await codeController.get_profile(
        { userId, password, oldPassword },
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




}

export default new userController();
