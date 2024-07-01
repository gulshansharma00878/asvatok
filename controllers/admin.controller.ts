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
    try {
      await codeController.all_buy_requests(
        { userId },
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
    const { id } = req.body;
    try {
      await codeController.reject_buy_request(
        { userId, id },
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



  
}

export default new userController();
