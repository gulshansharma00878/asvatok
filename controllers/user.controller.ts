import { Response, Request } from "express";
import db from "../models";
import commonController from "./common/common.controller";
import codeController from "./service/code.controller";
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
    try {
      let a_front = files.a_front[0].path;
      let a_back = files.a_back[0].path;
      let pan = files.pan[0].path;
      let pan_back = files.pan_back[0].path
      let self_pic = files.self_pic[0].path
      let sign = files.sign[0].path

      a_front = "https://asvatok.onrender.com/" +   a_front;
      a_back = "https://asvatok.onrender.com/" + a_back;
      pan = "https://asvatok.onrender.com/" + pan;
      pan_back = "https://asvatok.onrender.com/" + pan_back;
      self_pic = "https://asvatok.onrender.com/" + self_pic;
      sign = "https://asvatok.onrender.com/" + sign;
      await codeController.kyc({ userId, a_front, a_back, pan, pan_back, self_pic, sign }, res);
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
      pic = "http://localhost:4000/" + pic;

      await codeController.add_profile({ userId, aboutMe, wallet, pic }, res);
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
        pic = "http://localhost:4000/" + pic;
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


}

export default new userController();
