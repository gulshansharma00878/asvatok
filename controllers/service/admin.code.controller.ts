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
       x.quantity,
        x.amount,
        (select a.name from users a where a.id = x.userId) as name,
        (select b.amount from wallets b where b.userId = x.userId) as user_amount,
        x.active,
        x.createdAt
        FROM buys x;`, { type: QueryTypes.SELECT })
      } else {
        get_buy = await MyQuery.query(`SELECT x.id,x.userId,
        x.product_id,
         x.quantity,
        x.amount,
        (select a.name from users a where a.id = x.userId) as name,
        (select b.amount from wallets b where b.userId = x.userId) as user_amount,
          x.active,
        x.createdAt
        FROM buys x limit 10 offset ${offset};`, { type: QueryTypes.SELECT })
      }

      commonController.successMessage({ get_buy, total_pages }, "All buy request", res)

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

      if (!get_data) {
        commonController.errorMessage("Buy request not found or invalid Id", res)
        return
      }

      const check_product = await db.products.findOne({
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

        const newSupplyCal = parseFloat(get_data.amount) / parseFloat(check_product.initial_price)
        const newSupply = parseFloat(check_product.currentQuantity) - newSupplyCal


        const findUserAssets = await db.user_assets.findOne({
          where: {
            userId: get_data.userId,
            product_id: get_data.product_id
          }
        })
        if (findUserAssets) {

          await findUserAssets.update({
            quantity: parseFloat(findUserAssets.quantity) + newSupplyCal
          })
        } else {
          await db.user_assets.create({
            userId: get_data.userId,
            product_id: get_data.product_id,
            quantity: newSupplyCal,
            active: 0
          })
        }

        const getRecheckReq = await db.buys.findOne({
          where: {
            id
          }
        })

        commonController.successMessage(getRecheckReq, "buy req approved", res)
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

        const check_product = await db.products.findOne({
          where: {
            id: get_data.product_id
          }
        })

        const newSupplyCal = parseFloat(get_data.amount) / parseFloat(check_product.initial_price)
        const newSupply = parseFloat(check_product.currentQuantity) + newSupplyCal

        if (check_product) {
          const update_supply = check_product.update({
            currentQuantity: newSupply
          })
        }

      }
      get_data.update({
        active: 2,
        reason
      })
      commonController.successMessage(get_data, "products Data", res)

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
        hidden: 0, approved: 1
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
      commonController.successMessage({ data, total_pages }, "approved asset", res)

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
            updatedAt,contactNumber,currentQuantity
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
            updatedAt,currentQuantity
          FROM products
          LIMIT 10
          OFFSET ${offset}
        `, { type: QueryTypes.SELECT });
      }
      commonController.successMessage({ get_data, total_pages }, "all Products Data admin", res);
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
      createdAt,contactNumber,currentQuantity,
      updatedAt from products where id=${id} `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async update_product_quantity(payload: any, res: Response) {
    const { userId, id, currentQuantity } = payload
    try {
      let pro_data = await db.products.findOne({
        where: {
          id
        }
      })
      if (pro_data) {
        pro_data.update({
          currentQuantity
        })
      }

      pro_data = await db.products.findOne({
        where: {
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
        where: {
          id
        }
      })
      if (pro_data) {
        pro_data.update({
          current_price: price
        })
      }

      pro_data = await db.products.findOne({
        where: {
          id
        }
      })

      commonController.successMessage(pro_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async getAllActiveArticles(payload: any, res: Response) {
    try {
      const articles = await db.articles.findAll({ where: { active: true } });

      if (articles.length > 0) {
        commonController.successMessage(articles, "All active articles", res);
      } else {
        commonController.errorMessage("No active articles found", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_all_users(payload: any, res: Response) {
    try {
      const data = await MyQuery.query(`select u.id, u.email, u.name, u.mobile, u.active,u.createdAt, w.amount, w.active as wallet_active 
from users u 
left join
wallets w on u.id = w.userId
order by u.id desc`, { type: QueryTypes.SELECT })

      commonController.successMessage(data, "All users data", res);

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_user_by_id(payload: any, res: Response) {
    try {
      const { id } = payload
      const data = await MyQuery.query(`select u.id, u.email, u.name, u.mobile, u.active,u.createdAt, w.amount, w.active as wallet_active 
from users u 
left join
wallets w on u.id = w.userId
where u.id = ${id}
order by u.id desc`, { type: QueryTypes.SELECT })

      const userData = data[0]

      commonController.successMessage(userData, " users data", res);

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async approve_sell_trade(payload: any, res: Response) {
    try {
      const { id } = payload;

      // Fetch the sell trade details
      const checkSellTrade = await db.sell_trades.findOne({
        where: { id },
      });

      if (!checkSellTrade) {
        return commonController.errorMessage("Sell trade not found", res);
      }

      // Fetch the product details
      const check_product = await db.products.findOne({
        where: { id: checkSellTrade.product_id },
      });

      if (!check_product) {
        return commonController.errorMessage("Product not found", res);
      }

      // Find a matching buy trade
      const checkBuyTrade = await db.buy_trades.findOne({
        where: {
          product_id: checkSellTrade.product_id,
          amount: checkSellTrade.amount,
          active: 1
        },
      });

      if (checkBuyTrade) {
        await checkSellTrade.update({ active: 1 });

        // Fetch buyer and seller wallets
        const buyerWallet = await db.wallets.findOne({
          where: { userId: checkBuyTrade.userId },
        });

        const sellerWallet = await db.wallets.findOne({
          where: { userId: checkSellTrade.userId },
        });

        if (!buyerWallet || !sellerWallet) {
          return commonController.errorMessage("Wallets not found", res);
        }

        const buyingQuantity = parseFloat(checkBuyTrade.quantity);
        const sellingQuantity = parseFloat(checkSellTrade.quantity);
        const quantityToTrade = Math.min(buyingQuantity, sellingQuantity);

        // Update quantities in trades
        await checkSellTrade.update({ quantity: sellingQuantity - quantityToTrade });
        // await checkBuyTrade.update({ quantity: buyingQuantity - quantityToTrade });

        // Update buyer's assets
        const userProductAsset = await db.user_assets.findOne({
          where: {
            userId: checkBuyTrade.userId,
            product_id: checkBuyTrade.product_id,
          },
        });

        if (userProductAsset) {
          await userProductAsset.update({
            quantity: parseFloat(userProductAsset.quantity) + quantityToTrade,
          });
        } else {
          await db.user_assets.create({
            userId: checkBuyTrade.userId,
            product_id: checkBuyTrade.product_id,
            quantity: quantityToTrade,
          });
        }

        // Adjust wallet balances (assuming amount is price per unit quantity)
        // const totalAmount = checkSellTrade.amount * quantityToTrade;
        // await buyerWallet.update({ balance: buyerWallet.balance - totalAmount });
        // await sellerWallet.update({ balance: sellerWallet.balance + totalAmount });

        // Return success message
        commonController.successMessage(checkSellTrade, "Sell trade approved", res);
      } else {
        await checkSellTrade.update({ active: 1 });
        commonController.successMessage(checkSellTrade, "Sell trade approved", res);

      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async reject_sell_trade(payload: any, res: Response) {
    try {
      const { id } = payload

      const checkSellTrade = await db.sell_trades.findOne({
        where: {
          id,
        }
      })

      const findUserAssets = await db.user_assets.findOne({
        where: {
          userId: checkSellTrade.userId,
          product_id: checkSellTrade.product_id
        }
      })

      const newQuantity = parseFloat(findUserAssets.quantity) + parseFloat(checkSellTrade.quantity)

      findUserAssets.update({
        quantity: newQuantity
      })

      checkSellTrade.update({
        active: 2
      })

      commonController.successMessage(checkSellTrade, "sell trade rejected", res)


    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async approve_buy_trade(payload: any, res: Response) {
    try {
      const { id } = payload;
  
      // Fetch the buy trade details
      const checkBuyTrade = await db.buy_trades.findOne({
        where: { id },
      });
  
      if (!checkBuyTrade) {
        return commonController.errorMessage("Buy trade not found", res);
      }
  
      // Fetch the product details
      const check_product = await db.products.findOne({
        where: { id: checkBuyTrade.product_id },
      });
  
      if (!check_product) {
        return commonController.errorMessage("Product not found", res);
      }
  
      // Find a matching sell trade
      const checkSellTrade = await db.sell_trades.findOne({
        where: {
          product_id: checkBuyTrade.product_id,
          amount: checkBuyTrade.amount,
          active: 1,
        },
      });
  
      if (!checkSellTrade) {
        // If no matching sell trade, activate the buy trade and return
        await checkBuyTrade.update({ active: 1 });
        return commonController.successMessage(checkBuyTrade, "Buy trade approved", res);
      }
  
      // Fetch buyer and seller wallets
      const buyerWallet = await db.wallets.findOne({
        where: { userId: checkBuyTrade.userId },
      });
  
      const sellerWallet = await db.wallets.findOne({
        where: { userId: checkSellTrade.userId },
      });
  
      if (!buyerWallet || !sellerWallet) {
        return commonController.errorMessage("Wallets not found", res);
      }
  
      const buyingQuantity = parseFloat(checkBuyTrade.quantity);
      const sellingQuantity = parseFloat(checkSellTrade.quantity);
      const quantityToTrade = Math.min(buyingQuantity, sellingQuantity);
  
      // Calculate the total amount to be traded
      const totalAmount = checkBuyTrade.amount * quantityToTrade;
  
      // Adjust wallet balances
      // await buyerWallet.update({ balance: buyerWallet.balance - totalAmount });
      await sellerWallet.update({ balance: sellerWallet.balance + totalAmount });
  
      // Return success message
      commonController.successMessage(checkBuyTrade, "Buy trade approved", res);
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }
  


  async reject_buy_trade(payload: any, res: Response) {
    try {
      const { id } = payload

      const checkSellTrade = await db.sell_trades.findOne({
        where: {
          id,
        }
      })

      const findUserAssets = await db.wallets.findOne({
        where: {
          userId: checkSellTrade.userId,
        }
      })

      const newAmount = parseFloat(findUserAssets.amount) + parseFloat(checkSellTrade.amount)

      findUserAssets.update({
        amount: newAmount
      })

      checkSellTrade.update({
        active: 2
      })

      commonController.successMessage(checkSellTrade, "sell trade rejected", res)


    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }
}

export default new codeController();
