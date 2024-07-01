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
      const get_buy = await MyQuery.query(`SELECT id,userId,
    product_id,
    quantity,
    price,
    (select a.name from users a where a.id = userId) as name,
    (select b.amount from wallets b where b.userId = userId) as user_amount,
    active,
    createdAt
    FROM buys;`, { type: QueryTypes.SELECT })
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
      if (get_data.active === 2) {
        commonController.errorMessage("Buy request already rejected", res)
      } else {
        get_data.update({
          active: 1
        })

        commonController.successMessage(get_data, "products Data", res)
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

      const get_buy = await db.wallets.update({
        amount
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

      commonController.successMessage(get_buy, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }



}

export default new codeController();
