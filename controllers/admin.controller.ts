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
    const { id } = req.body;
    try {
      await codeController.reject_kyc(
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
