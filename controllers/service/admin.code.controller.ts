import { Response, Request, response } from "express";
import db from "../../models";
import commonController from "../common/common.controller";
import { Sequelize, QueryTypes, Op, json, where } from "sequelize";
import { Encrypt } from "../common/encryptpassword";
const MyQuery = db.sequelize;
const jwt = require("jsonwebtoken");
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
import { promisify } from 'util';
const unlinkAsync = promisify(fs.unlink);

class codeController {

  async all_buy_requests(payload: any, res: Response) {
    try {

      const { page } = payload;

      const offset = page * 10

      let get_buy;

      if (page == "-1") {
        get_buy = await MyQuery.query(`SELECT x.id,x.userId,
        x.product_id,
        0 as quantity,
        x.amount,
        (select a.name from users a where a.id = x.userId) as name,
        (select b.amount from wallets b where b.userId = x.userId) as user_amount,
        x.active,
        x.createdAt
        FROM buys x;`, { type: QueryTypes.SELECT })
      } else {
        get_buy = await MyQuery.query(`SELECT x.id,x.userId,
        x.product_id,
         0 as quantity,
        x.amount,
        (select a.name from users a where a.id = x.userId) as name,
        (select b.amount from wallets b where b.userId = x.userId) as user_amount,
          x.active,
        x.createdAt
        FROM buys x limit 10 offset ${offset};`, { type: QueryTypes.SELECT })
      }

      commonController.successMessage(get_buy, "All buy request", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async approve_buy_request(payload: any, res: Response) {
    const { userId, id } = payload
    try {
      const get_data = await db.buys.findOne({
        where: {
          id
        }
      })

      const get_product = await db.buys.findOne({
        where: {
          id: get_data.product_id
        }
      })
      if (get_data.active === 2) {
        commonController.errorMessage("Buy request already rejected", res)
      } else {
        get_data.update({
          active: 1
        })

        commonController.successMessage(get_product, "products Data", res)
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res)
    }
  }

  async reject_buy_request(payload: any, res: Response) {
    const { userId, id } = payload
    try {
      const get_data = await db.buys.findOne({
        where: {
          id
        }
      })
      if (get_data) {
        const get_wallet = await db.wallets.findOne({
          where: {
            userId: get_data.userId
          }
        })
        get_wallet.update({
          amount: Number(get_data.amount) + Number(get_wallet.amount)
        })
        commonController.successMessage(get_data, "products Data", res)
      } else {
        commonController.errorMessage(`Buy request not found`, res)

      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res)
    }
  }

  async add_balance_to_user(payload: any, res: Response) {
    try {
      const { userId, id, amount } = payload

      const get_wallet_balance = await db.wallets.findOne({
        where: {
          userId: id
        }
      })

      const updated_balance = Number(get_wallet_balance) + Number(amount)

      const get_buy = await db.wallets.update({
        amount: updated_balance
      }, {
        where: {
          userId: id
        }
      })

      commonController.successMessage(get_buy, "All products public", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async approve_product(payload: any, res: Response) {
    try {
      const { userId, id } = payload

      const get_buy = await db.products.update({
        hidden: 0
      }, {
        where: {
          id
        }
      })

      const get_Product = await db.products.findOne({
        where: {
          id
        }
      })

      commonController.successMessage(get_Product, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async get_all_kyc(payload: any, res: Response) {
    try {
      const { userId, id, page } = payload

      const offset = page * 10
      let data;
      if (page == "-1") {
        data = await MyQuery.query(`select * from kycs `, { type: QueryTypes.SELECT })
      } else {
        data = await MyQuery.query(`select * from kycs limit 10 offset ${offset} `, { type: QueryTypes.SELECT })
      }
      commonController.successMessage(data, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_kyc_by_id(payload: any, res: Response) {
    try {
      const { userId, id } = payload

      let data = await db.kycs.findOne({
        where: {
          id
        }
      })
      commonController.successMessage(data, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async approve_kyc(payload: any, res: Response) {
    try {
      const { userId, id } = payload

      let data = await db.kycs.findOne({
        where: {
          id
        }
      })
      if (data) {
        data.update({
          accepted: 1
        })
      }
      commonController.successMessage(data, "approved asset", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async reject_kyc(payload: any, res: Response) {
    try {
      const { userId, id } = payload

      let data = await db.kycs.findOne({
        where: {
          id
        }
      })
      if (data) {
        data.update({
          accepted: 2
        })
      }
      commonController.successMessage(data, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }



}

export default new codeController();
