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

      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM buys`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);

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

      commonController.successMessage({get_buy, total_pages}, "All buy request", res)

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
    const { userId, id, reason } = payload
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
        get_data.update({
          active:2,
          reason
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
        hidden: 0,approved: 1
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

      commonController.successMessage(get_Product, "approved product", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async get_all_kyc(payload: any, res: Response) {
    try {
      const { userId, id, page } = payload
      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM kycs `, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);
      const offset = page * 10
      let data;
      if (page == "-1") {
        data = await MyQuery.query(`select * from kycs `, { type: QueryTypes.SELECT })
      } else {
        data = await MyQuery.query(`select * from kycs limit 10 offset ${offset} `, { type: QueryTypes.SELECT })
      }
      commonController.successMessage({data, total_pages}, "approved asset", res)

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
      const { userId, id, reason } = payload

      let data = await db.kycs.findOne({
        where: {
          id
        }
      })
      if (data) {
        data.update({
          accepted: 2,
          reason
        })
      }
      commonController.successMessage(data, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async all_product_admin(payload: any, res: Response) {
    const { userId, page } = payload;
    try {
      const total_count = await MyQuery.query(`
        SELECT 
          count(*)
        FROM products`, { type: QueryTypes.SELECT });

        const total_pages = total_count / 10

      const offset = page * 10
      let get_data;
      if (page == "-1") {
        get_data = await MyQuery.query(`
          SELECT 
            id,
            userId,
             (select name from users where id = a.userId ) as user_name,
            sku_code,
            name,
            description,
            issue_year,
            item_condition,
            (SELECT a.catName FROM categories a WHERE a.id = category) AS category,
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
            images,
            custom_url,
            video,
            current_price,
            initial_price,
            note,
            sold,
            type_series,
            instock,
            keyword,
            cover_pic,
            hidden,
            approved,
            createdAt,
            updatedAt,contactNumber
          FROM products`, { type: QueryTypes.SELECT });
      } else {
        get_data = await MyQuery.query(`
          SELECT 
            id,
            userId,
            sku_code,
            name,
            description,
            issue_year,
            item_condition,
            (SELECT a.catName FROM categories a WHERE a.id = category) AS category,
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
            images,
            custom_url,
            video,
            current_price,
            initial_price,
            note,
            sold,
            type_series,
            instock,
            keyword,
            cover_pic,
            hidden,
            approved,
            createdAt,
            updatedAt
          FROM products
          LIMIT 10
          OFFSET ${offset}
        `, { type: QueryTypes.SELECT });
      }
      commonController.successMessage({get_data,total_pages}, "all Products Data admin", res);
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
    }
  }

  async add_product_admin(payload: any, res: Response) {
    try {
      const { userId, sku_code,
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
        keyword, images, cover_pic } = payload

      let proId = 0

      const getPro = await MyQuery.query(`select id from products order by id desc limit 1`, { type: QueryTypes.SELECT })
      if (getPro.length > 0) {
        proId = getPro[0].id
      }

      const get_catname = await db.categories.findOne({
        where: {
          id: category
        }
      })
      const catName = (get_catname.catName).replace(" ", "")
      const auto_sku = `${catName}/${name}/${Number(proId) + 1}`
      const add_pro = await db.products.create({
        userId, sku_code: auto_sku,
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
        hidden: 0, images, approved: 1, cover_pic
      })
      commonController.successMessage(add_pro, "product added", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_product_admin_by_id(payload: any, res: Response) {
    const { userId, id } = payload
    try {
      const get_data = await MyQuery.query(`select id,
      userId,
      sku_code,
      name,
      description,
      issue_year,
      item_condition,
      (select a.catName from categories a where id = category ) as category,
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
      images,
      custom_url,
      video,
      current_price,
      initial_price,
      note,
      sold,
      type_series,
      instock,
      keyword,
      cover_pic,
      hidden,
      approved,
      createdAt,contactNumber,
      updatedAt from products where id=${id} `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async update_product_quantity(payload: any, res: Response) {
    const { userId, id, quantity } = payload
    try {
      let pro_data = await db.products.findOne({
        where:{
          id
        }
      })
      if(pro_data){
        pro_data.update({
          quantity
        })
      }

      pro_data = await db.products.findOne({
        where:{
          id
        }
      })

      commonController.successMessage(pro_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async update_product_price(payload: any, res: Response) {
    const { userId, id, price } = payload
    try {
      let pro_data = await db.products.findOne({
        where:{
          id
        }
      })
      if(pro_data){
        pro_data.update({
          current_price: price
        })
      }

      pro_data = await db.products.findOne({
        where:{
          id
        }
      })

      commonController.successMessage(pro_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

}

export default new codeController();
