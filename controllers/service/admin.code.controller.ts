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
import emailServices from "../../emailServices/emailServices";
import TradesController from "../TradesController";
const unlinkAsync = promisify(fs.unlink);

class codeController {

  async all_buy_requests(payload: any, res: Response) {
    try {
      const { page, search } = payload; // Default values for page and search
      // const limit = 10; // Define a limit for pagination
      // const offset = page * limit;

      // // Base query to count total buy requests with optional search
      // let total_count_query = `
      //   SELECT COUNT(*) as count FROM buys x
      //   LEFT JOIN products p ON p.id = x.product_id
      //   LEFT JOIN users up ON up.id = p.userId
      //   LEFT JOIN users u ON u.id = x.userId
      // `;

      // // Add search condition if search term is provided
      // if (search) {
      //   total_count_query += `
      //     WHERE p.name LIKE :search
      //     OR u.email LIKE :search
      //     OR x.product_id LIKE :search

      //   `;
      // }

      // // Execute count query
      // const total_count_result = await MyQuery.query(total_count_query, {
      //   replacements: { search: `%${search}%` },
      //   type: QueryTypes.SELECT,
      // });

      // const total_count = total_count_result[0].count;
      // const total_pages = Math.ceil(total_count / limit);

      // Base query to fetch buy requests with optional pagination and search
      let fetch_query = `
        SELECT 
          x.id,
          x.product_id,
          x.quantity,
          x.amount,
          p.name as product_name,
          p.initial_price as product_price,
          u.name as BuyerName,
          u.email as buyerEmail,
          u.id as BuyerId,
          up.name as productOwnerName,
          up.email as productOwnerEmail,
          up.id as productOwnerId,
          x.active,
          x.createdAt
        FROM buys x
        LEFT JOIN products p ON p.id = x.product_id
        LEFT JOIN users up ON up.id = p.userId
        LEFT JOIN users u ON u.id = x.userId
      `;

      // Add search condition to fetch query
      if (search) {
        fetch_query += `
          WHERE p.name LIKE :search
          OR u.email LIKE :search
          OR x.product_id LIKE :search

        `;
      }

      // Add limit and offset for pagination
      // fetch_query += ` LIMIT :limit OFFSET :offset`;

      // Execute fetch query with replacements for pagination and search
      const get_buy = await MyQuery.query(fetch_query, {
        replacements: {
          search: `%${search}%`,
          // limit,
          // offset,
        },
        type: QueryTypes.SELECT,
      });

      // Formatting results
      const formattedResults = get_buy.map((result: {
        buyerEmail: any;
        id: any;
        product_id: any;
        quantity: any;
        amount: any;
        product_name: any;
        product_price: any;
        BuyerName: any;
        BuyerId: any;
        productOwnerName: any;
        productOwnerId: any;
        productOwnerEmail: any;
        active: any;
        createdAt: any;
        approvedAmount: any;
      }) => ({
        id: result.id,
        product_id: result.product_id,
        quantity: result.quantity,
        amount: result.amount,
        approvedAmount: result.approvedAmount,
        product_name: result.product_name,
        product_price: result.product_price,
        userFrom: {
          userName: result.BuyerName,
          userId: result.BuyerId,
          email: result.buyerEmail,
        },
        userTo: {
          userName: result.productOwnerName,
          userId: result.productOwnerId,
          email: result.productOwnerEmail,
        },
        active: result.active,
        createdAt: result.createdAt,
      }));

      // Return the formatted results with total pages
      commonController.successMessage({ get_buy: formattedResults, total_pages: 1 }, "All buy requests", res);
    } catch (e: any) {
      // Handle any errors
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async approve_buy_request(payload: any, res: Response) {
    const { userId, id, amount } = payload;
    try {
      // Fetch the buy request data
      const get_data = await db.buys.findOne({
        where: {
          id,
        },
      });

      const getUser = await db.users.findOne({
        where: {
          id: get_data.userId,
        },
      });

      const check_product = await db.products.findOne({
        where: {
          id: get_data.product_id,
        },
      });

      console.log(get_data, "get_data");

      console.log(check_product, "check_product");

      console.log(parseFloat(check_product.currentQuantity), parseFloat(get_data.quantity));


      if (parseFloat(check_product.currentQuantity) < parseFloat(get_data.quantity)) {
        return commonController.errorMessage("Quantity is greater than ipo quantity", res);

      }

      if (!get_data) {
        return commonController.errorMessage("Buy request not found or invalid Id", res);
      }

      if (parseFloat(amount) > parseFloat(get_data.amount)) {
        return commonController.errorMessage("Entered Amount is greater than requested amount", res);
      }

      if (get_data.active == 2) {
        return commonController.errorMessage("Buy request already rejected", res);
      }

      if (get_data.active == 1) {
        return commonController.errorMessage("Buy request already Accepted", res);
      }

      // Fetch product data

      if (parseFloat(check_product.currentQuantity) <= 0) {
        return commonController.errorMessage("IPO ended for this product", res);
      }

      // Calculate previous fee and total deducted amount
      const previousAmount = parseFloat(get_data.amount);
      const previousFee = (previousAmount * parseFloat(get_data.fee)) / 100;
      const totalDeducted = previousAmount + previousFee; // Original amount deducted from user's wallet

      console.log(previousAmount, "previousAmount");
      console.log(previousFee, "previousFee");
      console.log(totalDeducted, "totalDeducted");

      // Calculate new fee and amount based on the updated amount
      const newApprovedAmount = parseFloat(amount);
      const newFee = (newApprovedAmount * parseFloat(get_data.fee)) / 100;
      const totalDeductedNew = newApprovedAmount + newFee;

      console.log(newApprovedAmount, "newApprovedAmount");
      console.log(newFee, "newFee");
      console.log(totalDeductedNew, "totalDeductedNew");

      // Refund the difference (old deducted amount - new deducted amount)
      const refundAmount = totalDeducted - totalDeductedNew;
      console.log(refundAmount, "refundAmount");

      // Find user's wallet and update with the refund
      const findUserWallet = await db.wallets.findOne({
        where: {
          userId: get_data.userId,
        },
      });

      findUserWallet.update({
        amount: parseFloat(findUserWallet.amount) + refundAmount,
        freezeAmount: parseFloat(findUserWallet.freezeAmount) - totalDeducted
      });


      // Calculate the new supply and update product quantity
      const newSupplyCal = newApprovedAmount / parseFloat(check_product.initial_price);
      const newSupply = parseFloat(check_product.currentQuantity) - newSupplyCal;

      // Update the buy request with new approved amount and mark it active
      await get_data.update({
        active: 1,
        approvedAmount: newApprovedAmount,
        quantity: newSupplyCal
      });


      await check_product.update({
        currentQuantity: newSupply,
      });

      // Update user's assets or create a new entry
      const findUserAssets = await db.user_assets.findOne({
        where: {
          userId: get_data.userId,
          product_id: get_data.product_id,
        },
      });

      if (findUserAssets) {
        await findUserAssets.update({
          quantity: parseFloat(findUserAssets.quantity) + newSupplyCal,
        });
      } else {
        await db.user_assets.create({
          userId: get_data.userId,
          product_id: get_data.product_id,
          quantity: newSupplyCal,
          active: 0,
        });
      }

      // Send the success message
      const getRecheckReq = await db.buys.findOne({
        where: {
          id,
        },
      });

      await adminWallet(newFee)
      const email = await emailServices.ipoApprove(check_product.name, newSupplyCal)
      commonController.sendEmail(getUser.email, "ITO Approval", email)

      commonController.successMessage(getRecheckReq, "Buy request approved", res);

      TradesController.clearIpoAfterFinish()

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
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

      const getUser = await db.users.findOne({
        where: {
          id: get_data.userId,
        },
      });


      if (get_data) {
        const amountFee = (parseFloat(get_data.amount) * parseFloat(get_data.fee)) / 100;
        console.log(amountFee, "amountFee");
        const newAmount = parseFloat(get_data.amount) + amountFee
        console.log(newAmount, "newAmount");
        const get_wallet = await db.wallets.findOne({
          where: {
            userId: get_data.userId
          }
        })
        get_wallet.update({
          amount: newAmount + parseFloat(get_wallet.amount),
          freezeAmount: parseFloat(get_wallet.freezeAmount) - newAmount

        })

        const check_product = await db.products.findOne({
          where: {
            id: get_data.product_id
          }
        })

        const newSupplyCal = parseFloat(get_data.amount) / parseFloat(check_product.initial_price)
        const newSupply = parseFloat(check_product.currentQuantity) + newSupplyCal

        // if (check_product) {
        //   const update_supply = check_product.update({
        //     currentQuantity: newSupply
        //   })
        // }

        const email = await emailServices.ipoReject(check_product.name)
        commonController.sendEmail(getUser.email, "ITO Rejection", email)

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

      let get_wallet_balance = await db.wallets.findOne({
        where: {
          userId: id
        }
      })

      const updated_balance = parseFloat(get_wallet_balance.amount) + parseFloat(amount)

      console.log(updated_balance, "updated_balance");

      await get_wallet_balance.update({
        amount: updated_balance
      }, {
        where: {
          userId: id
        }
      })

      const wallet_balance = await MyQuery.query(`select w.*, u.email from wallets w left join users u on w.userId = u.id where w.userId = ${id}`, { type: QueryTypes.SELECT })
      const newData = wallet_balance[0]
      commonController.successMessage(newData, "Added balance by public", res)
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

      const addDummy = await db.sell_trades.create({
        amount: get_buy.initial_price,
        active: 3,
        product_id: get_buy.id,
        quantity: 0
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
      const { userId, id, page, search } = payload; // Default values for page and search
      const limit = 10; // Define a limit for pagination
      const offset = page * limit;

      // Base query to count total KYC records with optional search
      let total_count_query = `
        SELECT COUNT(*) as count 
        FROM kycs k 
        LEFT JOIN users u ON k.userId = u.id
      `;

      // Add search condition if provided
      if (search) {
        total_count_query += `
          WHERE u.email LIKE :search
          or u.name LIKE :search
        `;
      }

      // Execute count query
      const total_count_result = await MyQuery.query(total_count_query, {
        replacements: { search: `%${search}%` },
        type: QueryTypes.SELECT,
      });

      const total_count = total_count_result[0].count;
      const total_pages = Math.ceil(total_count / limit);

      // Base query to fetch KYC records with optional pagination and search
      let fetch_query = `
        SELECT k.*, u.email 
        FROM kycs k 
        LEFT JOIN users u ON k.userId = u.id
      `;

      // Add search condition to fetch query
      if (search) {
        fetch_query += `
          WHERE u.email LIKE :search
          or u.name LIKE :search
        `;
      }

      // Add limit and offset for pagination
      fetch_query += ` LIMIT :limit OFFSET :offset`;

      // Execute fetch query with parameter replacements
      const data = await MyQuery.query(fetch_query, {
        replacements: {
          search: `%${search}%`,
          limit,
          offset,
        },
        type: QueryTypes.SELECT,
      });

      // Return the data with total pages
      commonController.successMessage({ data, total_pages }, "Approved asset", res);
    } catch (e) {
      // Handle any errors
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_kyc_by_id(payload: any, res: Response) {
    try {
      const { userId, id } = payload;

      // Using parameterized query to avoid SQL injection
      const newData = await MyQuery.query(
        `SELECT k.*, u.email 
         FROM kycs k 
         LEFT JOIN users u ON k.userId = u.id 
         WHERE k.id = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
      );

      // Ensure data exists before proceeding
      if (newData.length > 0) {
        const data = newData[0];
        return commonController.successMessage(data, "approved asset", res);
      } else {
        return commonController.errorMessage("KYC record not found", res);
      }
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
        const getName = await db.users.findOne({
          where: {
            id: data.userId
          }
        })
        const email = await emailServices.kycApprovalMail(getName.name)
        commonController.sendEmail(getName.email, "KYC Status Update", email)
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

        const getName = await db.users.findOne({
          where: {
            id: data.userId
          }
        })
        const email = await emailServices.kycRejectedMail(getName.name)
        commonController.sendEmail(getName.email, "KYC Status Update", email)
      }
      commonController.successMessage(data, "approved asset", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async all_product_admin(payload: any, res: Response) {
    const { userId, page, search } = payload; // Default values for page and search
    const limit = 10; // Define a limit for pagination
    const offset = page * limit;

    try {
      // Base query to count total products with optional search
      let total_count_query = `
        SELECT COUNT(*) as count 
        FROM products p
        left join 
        users u on u.id = p.userId
        left join 
        categories c on c.id = p.category
      `;

      // Add search condition if provided
      if (search) {
        total_count_query += `
          WHERE p.name LIKE :search OR p.sku_code LIKE :search or u.name LIKE :search or u.email LIKE :search
        `;
      }

      // Execute count query
      const total_count_result = await MyQuery.query(total_count_query, {
        replacements: { search: `%${search}%` },
        type: QueryTypes.SELECT,
      });

      const total_count = total_count_result[0].count;
      const total_pages = Math.ceil(total_count / limit);

      // Base query to fetch product data with optional pagination and search
      let fetch_query = `
        SELECT 
          p.id,
          p.userId,
          p.sku_code,
          p.name,
          p.description,
          p.issue_year,
          p.item_condition,
           u.name  AS user_name,
          u.email  AS user_email,
          c.catName AS category,
          p.varities,
          p.city,
          p.ruler,
          p.denomination,
          p.signatory,
          p.rarity,
          p.specification,
          p.metal,
          p.remarks,
          p.quantity,
          p.images,
          p.custom_url,
          p.video,
          p.current_price,
          p.initial_price,
          p.note,
          p.sold,
          p.type_series,
          p.instock,
          p.keyword,
          p.cover_pic,
          p.hidden,
          p.approved,
          p.createdAt,
          p.updatedAt,
          p.currentQuantity,
          p.ipoQuantity
        FROM products p
        left join 
        users u on u.id = p.userId
        left join 
        categories c on c.id = p.category
      `;

      // Add search condition to fetch query
      if (search) {
        fetch_query += `
          WHERE p.name LIKE :search OR p.sku_code LIKE :search or u.name LIKE :search or u.email LIKE :search
        `;
      }

      // Add limit and offset for pagination
      fetch_query += ` LIMIT :limit OFFSET :offset`;

      // Execute fetch query with parameter replacements
      const get_data = await MyQuery.query(fetch_query, {
        replacements: {
          search: `%${search}%`,
          limit,
          offset,
        },
        type: QueryTypes.SELECT,
      });

      // Return the data with total pages
      commonController.successMessage({ get_data, total_pages }, "All Products Data Admin", res);
    } catch (e) {
      // Handle any errors
      commonController.errorMessage(`${e}`, res);
    }
  }

  async update_product_admin(payload: any, res: Response) {
    try {
      const { id, userId,
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
        // quantity,
        custom_url,
        video,
        // current_price,
        // initial_price,
        note,
        sold,
        type_series,
        instock,
        keyword, images, cover_pic } = payload

      let proId = 0

      // const getPro = await MyQuery.query(`select id from products order by id desc limit 1`, { type: QueryTypes.SELECT })
      // if (getPro.length > 0) {
      //   proId = getPro[0].id
      // }else{
      //   proId = 1
      // }

      // const get_catname = await db.categories.findOne({
      //   where: {
      //     id: category
      //   }
      // })
      // const catName = (get_catname.catName).replace(" ", "")
      // const auto_sku = `${catName}/${name}/${Number(proId) + 1}`
      const check = await db.products.findOne({
        where: {
          id
        }
      })
      if (check) {
        const add_pro = await check.update({
          userId,
          //  sku_code: auto_sku,
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
          // quantity,
          custom_url,
          video,
          // current_price,
          // initial_price,
          note,
          sold,
          type_series,
          instock,
          keyword,
          // hidden: 0,
          images,
          // approved: 1, 
          cover_pic
        })

      }
      const updated = await db.products.findOne({
        where: {
          id
        }
      })
      commonController.successMessage(updated, "product updated", res)

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
      item_condition, category,
      (select a.catName from categories a where id = category ) as category_name,
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
      images as img,
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
      createdAt,contactNumber,currentQuantity,ipoQuantity,
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
      const { page, search } = payload;
      let data: any = "";

      if (search) {
        data = await MyQuery.query(`
          select u.id, u.email, u.name, u.mobile, u.active, u.createdAt,
          w.amount, w.active as wallet_active
          from users u 
          left join wallets w on u.id = w.userId
          where u.email like :search or u.name like :search
          order by u.id desc`,
          {
            replacements: { search: `%${search}%` },
            type: QueryTypes.SELECT,
          }
        );
      } else {
        data = await MyQuery.query(`
          select u.id, u.email, u.name, u.mobile, u.active, u.createdAt,
          w.amount, w.active as wallet_active
          from users u 
          left join wallets w on u.id = w.userId
          order by u.id desc`,
          { type: QueryTypes.SELECT }
        );
      }

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

  // async approve_sell_trade(payload: any, res: Response) {
  //   try {
  //     const { id, userIdBuyer } = payload;

  //     // await checkSellTrade.update({ active: 1 });

  //     // Fetch buyer and seller wallets
  //     const buyerWallet = await db.wallets.findOne({
  //       where: { userId: checkBuyTrade.userId },
  //     });

  //     const sellerWallet = await db.wallets.findOne({
  //       where: { userId: checkSellTrade.userId },
  //     });

  //     if (!buyerWallet || !sellerWallet) {
  //       return commonController.errorMessage("Wallets not found", res);
  //     }

  //     // Update buyer's assets
  //     const userProductAsset = await db.user_assets.findOne({
  //       where: {
  //         userId: checkBuyTrade.userId,
  //         product_id: checkBuyTrade.product_id,
  //       },
  //     });

  //     if (userProductAsset) {
  //       await userProductAsset.update({
  //         quantity: parseFloat(userProductAsset.quantity) + quantityToTrade,
  //         latestId: checkBuyTrade.id

  //       });
  //     } else {
  //       await db.user_assets.create({
  //         userId: checkBuyTrade.userId,
  //         product_id: checkBuyTrade.product_id,
  //         quantity: quantityToTrade,
  //         latestId: checkBuyTrade.id

  //       });
  //     }

  //     // Adjust wallet balances (assuming amount is price per unit quantity)
  //     // const totalAmount = checkSellTrade.amount * quantityToTrade;
  //     // await buyerWallet.update({ balance: buyerWallet.balance - totalAmount });
  //     // await sellerWallet.update({ balance: sellerWallet.balance + totalAmount });

  //     // Return success message
  //     commonController.successMessage(checkSellTrade, "Sell trade approved", res);

  //   } catch (e) {
  //     commonController.errorMessage(`${e}`, res);
  //     console.warn(e, "error");
  //   }
  // }

  // async reject_sell_trade(payload: any, res: Response) {
  //   try {
  //     const { id } = payload

  //     const checkSellTrade = await db.sell_trades.findOne({
  //       where: {
  //         id,
  //       }
  //     })

  //     const findUserAssets = await db.user_assets.findOne({
  //       where: {
  //         userId: checkSellTrade.userId,
  //         product_id: checkSellTrade.product_id
  //       }
  //     })

  //     const newQuantity = parseFloat(findUserAssets.quantity) + parseFloat(checkSellTrade.quantity)

  //     findUserAssets.update({
  //       quantity: newQuantity
  //     })

  //     checkSellTrade.update({
  //       active: 2
  //     })

  //     commonController.successMessage(checkSellTrade, "sell trade rejected", res)


  //   } catch (e) {
  //     commonController.errorMessage(`${e}`, res);
  //     console.warn(e, "error");
  //   }
  // }

  async approve_trade(payload: any, res: Response) {
    try {
      const {
        id,
      } = payload;



      const check_master = await db.trades_masters.findOne({
        where: { id },
      });


      if (!check_master) {
        return commonController.errorMessage("Trades not found", res);
      }

      const { userIdBuyer, userIdSeller, sellId, buyId,
        product_id, quantityBuy, amountBuy, quantitySell, amountSell,
        quantityToTrade, totalAmount, sellQuantityAfterSub } = check_master
      // Fetch the product details

      const check_product = await db.products.findOne({
        where: { id: product_id },
      });

      // Fetch buyer and seller wallets
      const buyerWallet = await db.wallets.findOne({
        where: { userId: userIdBuyer },
      });

      const sellerWallet = await db.wallets.findOne({
        where: { userId: userIdSeller },
      });

      const buyTrade = await db.buy_trades.findOne({
        where: { userId: userIdBuyer },
      });

      const sellTrade = await db.sell_trades.findOne({
        where: { userId: userIdSeller },
      });

      const getBuyer = await db.users.findOne({
        where: {
          id: userIdBuyer
        }
      })

      const getSeller = await db.users.findOne({
        where: {
          id: userIdSeller
        }
      })

      if (!buyerWallet || !sellerWallet) {
        return commonController.errorMessage("Wallets not found", res);
      }

      if (!buyTrade || !sellTrade) {
        return commonController.errorMessage("trades not found", res);
      }

      // Calculate the total amount to be traded if not provided
      const calculatedTotalAmount = amountSell

      // Update the seller's wallet balance
      await sellerWallet.update({ amount: parseFloat(sellerWallet.amount) + parseFloat(calculatedTotalAmount) });

      const calAmountToProduct = parseFloat(totalAmount) / parseFloat(quantityToTrade)

      // Update the product's current price
      await check_product.update({ current_price: calAmountToProduct });

      // Update or create the buyer's asset
      const userProductAsset = await db.user_assets.findOne({
        where: {
          userId: userIdBuyer,
          product_id: product_id,
        },
      });



      if (userProductAsset) {
        await userProductAsset.update({
          quantity: parseFloat(userProductAsset.quantity) + parseFloat(quantityToTrade),
          latestId: buyId,
        });
      } else {
        await db.user_assets.create({
          userId: userIdBuyer,
          product_id: product_id,
          quantity: quantityBuy,
          latestId: buyId,
        });
      }

      // Update trade statuses based on quantities
      if (buyTrade.quantity == 0 && sellTrade.quantity != 0) {
        await buyTrade.update(
          { active: 1 },
        );

      } else if (buyTrade.quantity != 0 && sellTrade.quantity == 0) {
        await sellTrade.update(
          { active: 1 },
        );

      } else {
        await buyTrade.update(
          { active: 1 },
        );
        await sellTrade.update(
          { active: 1 },
        );
      }

      await check_master.update({
        active: 1
      });

      const emailBuy = await emailServices.tradeApprove(check_product.name, buyTrade.total_quantityuantity, "Buy")
      const emailSell = await emailServices.tradeApprove(check_product.name, sellTrade.quantity, "Sell")

      commonController.sendEmail(getBuyer.email, "Trade Approval", emailBuy)
      commonController.sendEmail(getSeller.email, "Trade Approval", emailSell)

      // Return success message
      commonController.successMessage({}, "Trade approved", res);

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async reject_trade(payload: any, res: Response) {
    try {
      const { id } = payload


      const check_master = await db.trades_masters.findOne({
        where: { id },
      });

      if (!check_master) {
        return commonController.errorMessage("Trades not found", res);
      }

      const { userIdBuyer, userIdSeller, sellId, buyId,
        product_id, quantityBuy, amountBuy, quantitySell, amountSell,
        quantityToTrade, totalAmount, sellQuantityAfterSub } = check_master

      let checkBuyTrade = await db.buy_trades.findOne({
        where: {
          id: buyId,
        }
      })

      let checkSellTrade = await db.sell_trades.findOne({
        where: {
          id: sellId,
        }
      })

      // const calBuyAmount = parseFloat(findUserAssetsBuy.amount) + (parseFloat(checkBuyTrade.amount) * parseFloat(check_master.quantityBuy))
      const calSellQuantity = parseFloat(check_master.quantitySell)
      const calBuyQuantity = parseFloat(check_master.quantityBuy)

      await checkBuyTrade.update({
        quantity: parseFloat(checkBuyTrade.quantity) + calBuyQuantity,
        active: 0
      })

      await checkSellTrade.update({
        quantity: parseFloat(checkSellTrade.quantity) + calSellQuantity,
        active: 0
      })

      checkBuyTrade = await db.buy_trades.findOne({
        where: {
          id: buyId,
        }
      })

      checkSellTrade = await db.sell_trades.findOne({
        where: {
          id: sellId,
        }
      })

      await check_master.update({
        active: 2
      })

      const check_product = await db.products.findOne({
        where: {
          id: product_id
        }
      })

      const getBuyer = await db.users.findOne({
        where: {
          id: userIdBuyer
        }
      })

      const getSeller = await db.users.findOne({
        where: {
          id: userIdSeller
        }
      })

      const emailBuy = await emailServices.tradeReject(check_product.name, "Buy")
      const emailSell = await emailServices.tradeReject(check_product.name, "Sell")

      commonController.sendEmail(getBuyer.email, "Trade Rejected", emailBuy)
      commonController.sendEmail(getSeller.email, "Trade Rejected", emailSell)

      commonController.successMessage({ checkBuyTrade, checkSellTrade }, " trade rejected", res)


    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  //   async get_all_trades(payload: any, res: Response) {
  //     const { userId, page } = payload
  //     try {

  //       const offset = page * 10
  //       const total_count = await MyQuery.query(`
  //         SELECT (SELECT COUNT(*) FROM buy_trades) + (SELECT COUNT(*) FROM sell_trades) AS totalCount;`, { type: QueryTypes.SELECT });
  //       const new_count = total_count[0].totalCount
  //       const total_pages = Math.ceil(new_count / 10);
  //       let get_data: any[] = []
  //       if (page) {
  //         get_data = await MyQuery.query(`SELECT b.id,
  //           b.userId,
  //           b.product_id,
  //            p.name as product_name,
  //            p.initial_price as product_price,
  //            u.name as userName,
  //             up.name as productOwnerName,
  //             up.id as productOwnerId,
  //           b.quantity,
  //           b.amount,
  //           b.active,
  //           b.createdAt,
  //           '1' AS type
  //      FROM buy_trades b
  //      left join
  //         products p on p.id =b.product_id
  //         left join
  //         users up on up.id =p.userId
  //         left join
  //         users u on u.id =b.userId
  //    UNION
  //    SELECT s.id,
  //           s.userId,
  //           s.product_id,
  //            p.name as product_name,
  //            p.initial_price as product_price,
  //            u.name as userName,
  //             up.name as productOwnerName,
  //             up.id as productOwnerId,
  //           s.quantity,
  //           s.amount,
  //           s.active,
  //           s.createdAt,
  //           '2' AS type
  //      FROM sell_trades s left join
  //         products p on p.id =s.product_id
  //         left join
  //         users up on up.id =p.userId
  //         left join
  //         users u on u.id =s.userId
  //  limit 10 offset ${offset}  
  //     `, { type: QueryTypes.SELECT })
  //       } else {
  //         get_data = await MyQuery.query(`SELECT b.id,
  //           b.userId,
  //           b.product_id,
  //            p.name as product_name,
  //            p.initial_price as product_price,
  //            u.name as userName,
  //             up.name as productOwnerName,
  //             up.id as productOwnerId,
  //           b.quantity,
  //           b.amount,
  //           b.active,
  //           b.createdAt,
  //           '1' AS type
  //      FROM buy_trades b
  //      left join
  //         products p on p.id =b.product_id
  //         left join
  //         users up on up.id =p.userId
  //         left join
  //         users u on u.id =b.userId
  //    UNION
  //    SELECT s.id,
  //           s.userId,
  //           s.product_id,
  //            p.name as product_name,
  //            p.initial_price as product_price,
  //            u.name as userName,
  //             up.name as productOwnerName,
  //             up.id as productOwnerId,
  //           s.quantity,
  //           s.amount,
  //           s.active,
  //           s.createdAt,
  //           '2' AS type
  //      FROM sell_trades s left join
  //         products p on p.id =s.product_id
  //         left join
  //         users up on up.id =p.userId
  //         left join
  //         users u on u.id =s.userId

  //     `, { type: QueryTypes.SELECT })
  //       }


  //       commonController.successMessage({ total_pages, get_data }, "All trades Data", res)
  //     } catch (e) {
  //       commonController.errorMessage(`${e}`, res)

  //     }
  //   }

  async get_all_trades(payload: any, res: Response) {
    const { userId, page, search } = payload; // Default values for page and search
    // const limit = 10; // Define a limit for pagination
    // const offset = page * limit;

    try {
      // Base query to count total trades with optional search filtering
      // let totalQuery = `
      //   SELECT COUNT(*) as totalCount FROM trades_masters tm
      //   LEFT JOIN products p ON p.id = tm.product_id
      //   LEFT JOIN users bu ON bu.id = tm.userIdBuyer
      //   LEFT JOIN users su ON su.id = tm.userIdSeller
      //   LEFT JOIN users pu ON pu.id = p.userId
      // `;

      // if (search) {
      //   totalQuery += `
      //     WHERE tm.product_id LIKE :search
      //     OR bu.email LIKE :search
      //     OR su.email LIKE :search
      //     OR p.name LIKE :search
      //   `;
      // }

      // const total_count_result = await MyQuery.query(totalQuery, {
      //   replacements: { search: `%${search}%` },
      //   type: QueryTypes.SELECT,
      // });

      // const total_count = total_count_result[0].totalCount;
      // const total_pages = Math.ceil(total_count / limit);

      // Base query to fetch trade data with optional search filtering
      let query = `
        SELECT tm.id,
               tm.userIdBuyer,
               tm.userIdSeller,
               tm.sellId,
               tm.buyId,
               pu.name as productOwnerName,
               bu.name as userNameBuyer,
               bu.email as buyerEmail,
               su.email as sellerEmail,
               su.name as userNameSeller,
               p.current_price as product_price,
               p.name as product_name,
               tm.product_id,
               tm.quantityBuy,
               tm.amountBuy,
               tm.quantitySell,
               tm.amountSell,
               tm.active,
               tm.quantityToTrade,
               tm.totalAmount,
               tm.sellQuantityAfterSub,
               tm.createdAt
        FROM trades_masters tm
        LEFT JOIN products p ON p.id = tm.product_id
        LEFT JOIN users bu ON bu.id = tm.userIdBuyer
        LEFT JOIN users su ON su.id = tm.userIdSeller
        LEFT JOIN users pu ON pu.id = p.userId
      `;

      // Append search condition if present
      if (search) {
        query += `
          WHERE tm.product_id LIKE :search
          OR bu.email LIKE :search
          OR su.email LIKE :search
          OR p.name LIKE :search
        `;
      }

      // Add limit and offset for pagination
      // query += ` LIMIT :limit OFFSET :offset;`;

      // Fetch data with parameterized queries to avoid SQL injection
      const get_data = await MyQuery.query(query, {
        replacements: {
          search: `%${search}%`,
          // limit,
          // offset,
        },
        type: QueryTypes.SELECT,
      });

      // Return the data with total pages
      commonController.successMessage({ total_pages: 1, get_data }, "All trades data", res);
    } catch (e) {
      // Handle any errors
      commonController.errorMessage(`${e}`, res);
    }
  }
  async get_user_assets(payload: any, res: Response) {
    const { userId, page } = payload
    try {

      const offset = page * 10
      const total_count = await MyQuery.query(`
      SELECT count(*) as totalCount FROM user_assets ;`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].totalCount
      const total_pages = Math.ceil(new_count / 10);
      let get_data: any[] = []
      if (page) {
        get_data = await MyQuery.query(`SELECT tm.id,
          tm.userId,
          tm.quantity,
          u.email,
          u.name as userName,
          tm.product_id,
     pu.name as productOwnerName,
    p.name as product_name,
    tm.createdAt
FROM user_assets tm
left join
        products p on p.id =tm.product_id
left join
        users pu on pu.id =p.userId
left join
        users u on u.id =tm.userId
limit 10 offset ${offset}  
  `, { type: QueryTypes.SELECT })
      } else {
        get_data = await MyQuery.query(`SELECT tm.id,
          tm.userId,
          tm.quantity,
          tm.product_id,
          u.email,
          u.name as userName,
     pu.name as productOwnerName,
    p.name as product_name,
    tm.createdAt
FROM user_assets tm
left join
        products p on p.id =tm.product_id
left join
        users pu on pu.id =p.userId
left join
        users u on u.id =tm.userId
  `, { type: QueryTypes.SELECT })
      }
      commonController.successMessage({ total_pages, get_data }, "All trades Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_all_transactions(payload: any, res: Response) {
    const { userId, page, search } = payload
    try {

      const offset = page * 10
      const total_count = await MyQuery.query(`
        SELECT COUNT(*) as totalCount
        FROM (
            SELECT id FROM sell_trades
            UNION ALL
            SELECT id FROM buy_trades
            UNION ALL
            SELECT id FROM wallets_histories
        ) AS combined_result;`,
        { type: QueryTypes.SELECT }
      );
      const new_count = total_count[0].totalCount;
      const total_pages = Math.ceil(new_count / 10);

      let get_data: any[] = []
      if (page) {
        get_data = await MyQuery.query(`
SELECT * FROM (
    SELECT 
        'sell' AS trade_type, 
        st.id, 
        st.userId, 
        st.product_id, 
        p.name AS product_name,
        st.quantity, 
        st.amount, 
        st.active, 
        NULL AS history_type, 
        NULL AS action, 
        NULL AS item, 
        NULL AS order_id, 
        NULL AS receipt, 
        NULL AS order_created_at, 
        st.createdAt, 
        st.updatedAt
    FROM 
        sell_trades st
    LEFT JOIN 
        products p ON p.id = st.product_id

    UNION ALL

    SELECT 
        'buy' AS trade_type, 
        bt.id, 
        bt.userId, 
        bt.product_id, 
        p.name AS product_name,
        bt.quantity, 
        bt.amount, 
        bt.active, 
        NULL AS history_type, 
        NULL AS action, 
        NULL AS item, 
        NULL AS order_id, 
        NULL AS receipt, 
        NULL AS order_created_at, 
        bt.createdAt, 
        bt.updatedAt
    FROM 
        buy_trades bt
    LEFT JOIN 
        products p ON p.id = bt.product_id

    UNION ALL

    SELECT 
        'wallet' AS trade_type, 
        wh.id, 
        wh.userId, 
        NULL AS product_id, 
        NULL AS product_name,
        NULL AS quantity, 
        wh.amount, 
        NULL AS active, 
        wh.history_type, 
        wh.action, 
        wh.item, 
        wh.order_id, 
        wh.receipt, 
        wh.order_created_at, 
        wh.createdAt, 
        wh.updatedAt
    FROM 
        wallets_histories wh
) AS combined_result
ORDER BY createdAt DESC
    limit 10 offset ${offset}  
  `, { type: QueryTypes.SELECT })
      } else {
        get_data = await MyQuery.query(`

SELECT 
    'sell' AS trade_type, 
    st.id, 
    st.userId, 
    st.product_id, 
    p.name AS product_name,
    st.quantity, 
    st.amount, 
    st.active, 
    NULL AS history_type, 
    NULL AS action, 
    NULL AS item, 
    NULL AS order_id, 
    NULL AS receipt, 
    NULL AS order_created_at, 
    st.createdAt, 
    st.updatedAt
FROM 
    sell_trades st
LEFT JOIN 
    products p ON p.id = st.product_id

UNION ALL

SELECT 
    'buy' AS trade_type, 
    bt.id, 
    bt.userId, 
    bt.product_id, 
    p.name AS product_name,
    bt.quantity, 
    bt.amount, 
    bt.active, 
    NULL AS history_type, 
    NULL AS action, 
    NULL AS item, 
    NULL AS order_id, 
    NULL AS receipt, 
    NULL AS order_created_at, 
    bt.createdAt, 
    bt.updatedAt
FROM 
    buy_trades bt
LEFT JOIN 
    products p ON p.id = bt.product_id

UNION ALL

SELECT 
    'wallet' AS trade_type, 
    wh.id, 
    wh.userId, 
    NULL AS product_id, 
    NULL AS product_name,
    NULL AS quantity, 
    wh.amount, 
    NULL AS active, 
    wh.history_type, 
    wh.action, 
    wh.item, 
    wh.order_id, 
    wh.receipt, 
    wh.order_created_at, 
    wh.createdAt, 
    wh.updatedAt
FROM 
    wallets_histories wh;

  `, { type: QueryTypes.SELECT })
      }
      commonController.successMessage({ total_pages, get_data }, "All trades Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async deductBalance(payload: any, res: Response) {
    const { userId, amount, id } = payload;

    try {
      // Fetch user's wallet data
      const walletData = await db.wallets.findOne({ where: { id } });

      if (!walletData) {
        return commonController.errorMessage("User wallet not found", res);
      }

      const userBalance = parseFloat(walletData.amount);
      console.log(userBalance);

      // Check if the user has sufficient balance
      const deductAmount = parseFloat(amount);
      console.log(deductAmount);

      if (userBalance < deductAmount) {
        return commonController.errorMessage("Entered amount is greater than user's balance", res);
      }

      // Update balance after deduction
      const updatedBalance = userBalance - deductAmount;
      await walletData.update({ amount: updatedBalance });

      const wallet_balance = await MyQuery.query(`select w.*, u.email from wallets w left join users u on w.userId = u.id where w.userId = ${id}`, { type: QueryTypes.SELECT })
      const newData = wallet_balance[0]

      // Return success with updated balance data
      return commonController.successMessage(
        newData,
        "Balance updated successfully",
        res
      );
    } catch (error) {
      // Handle any errors
      return commonController.errorMessage(`${error}`, res);
    }
  }

  async bulk_product_data(payload: any, res: Response) {
    const { filePath } = payload;

    try {
      interface CsvData {
        [key: string]: string;
      }

      const results: CsvData[] = [];

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data: CsvData) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      if (results.length === 0) {
        throw new Error('CSV file is empty or incorrectly formatted');
      }
      const keys = Object.keys(results[0]).map(key => key.trim());
      const escapedKeys = keys.map(key => `\`${key}\``).join(', ');

      const values = results.map(row => `(${Object.values(row).map(value => MyQuery.escape(value)).join(', ')})`);
      const valuesString = values.join(', ');

      const query = `INSERT INTO ashva (${escapedKeys}) VALUES ${valuesString}`;

      console.log("Generated SQL Query: ", query);

      await MyQuery.query(query, { type: QueryTypes.INSERT });

      await unlinkAsync(filePath);

      commonController.successMessage({ data: results.length }, "CSV data successfully stored in the database.", res);
    } catch (error) {
      try {
        if (fs.existsSync(filePath)) {
          await unlinkAsync(filePath);
        }
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
      commonController.errorMessage(`${error}`, res);
    }
  }

  async adminDashboard(payload: any, res: Response) {
    const { userId } = payload;
    try {
      const getDate = new Date();

      // Format today's date and next day's date
      const todayDate = `${getDate.getFullYear()}-${String(getDate.getMonth() + 1).padStart(2, '0')}-${String(getDate.getDate()).padStart(2, '0')} 00:00:00`;

      getDate.setDate(getDate.getDate() + 1); // Move to the next day
      const nextDaydate = `${getDate.getFullYear()}-${String(getDate.getMonth() + 1).padStart(2, '0')}-${String(getDate.getDate()).padStart(2, '0')} 00:00:00`;

      // Combine queries where possible
      const results = await MyQuery.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) AS totalUser,
          (SELECT IFNULL(SUM(amount), 0) FROM wallets) AS totalAsva,
          (SELECT COUNT(*) FROM products WHERE currentQuantity != 0) AS totalIpo,
          (SELECT COUNT(*) FROM products WHERE currentQuantity = 0) AS totalNonIpo,
          (SELECT IFNULL(SUM(amount), 0) FROM wallets_histories WHERE action = 1 AND createdAt BETWEEN '${todayDate}' AND '${nextDaydate}') AS dailyAsvaPurchase,
          (SELECT IFNULL(SUM(amount), 0) FROM wallets_histories WHERE action = 1) AS totalAsvaPurchase,
          (SELECT IFNULL(COUNT(*), 0) FROM buy_trades WHERE active = 1 AND createdAt BETWEEN '${todayDate}' AND '${nextDaydate}') 
            + (SELECT IFNULL(COUNT(*), 0) FROM sell_trades WHERE active = 1 AND createdAt BETWEEN '${todayDate}' AND '${nextDaydate}') AS dailyTrade,
          (SELECT COUNT(*) FROM buy_trades WHERE active = 1) 
            + (SELECT COUNT(*) FROM sell_trades WHERE active = 1) AS totalTrade
      `, { type: QueryTypes.SELECT });

      // Destructure results for clarity
      const {
        totalUser, totalAsva, totalIpo, totalNonIpo, dailyAsvaPurchase,
        totalAsvaPurchase, dailyTrade, totalTrade
      } = results[0];

      // Send the response
      commonController.successMessage({
        totalUser, totalAsva, totalIpo, totalNonIpo,
        dailyAsvaPurchase, totalAsvaPurchase, dailyTrade, totalTrade
      }, "Dashboard data", res);

    } catch (e) {
      console.log(e);
      commonController.errorMessage(`${e}`, res);
    }
  }

  async updateFees(payload: any, res: Response) {
    try {
      const { razorPay, buy, sell, ipo, withdraw } = payload;

      // Fetch the existing fees data
      const feesData = await db.fees.findOne({ where: { id: 1 } });
      if (!feesData) {
        return commonController.errorMessage("Fees data not found", res);
      }

      // Update fees with new values or fallback to existing values
      await feesData.update({
        razorPay: razorPay ?? feesData.razorPay,
        buy: buy ?? feesData.buy,
        sell: sell ?? feesData.sell,
        ipo: ipo ?? feesData.ipo,
        withdraw: withdraw ?? feesData.withdraw
      });

      return commonController.successMessage(feesData, "Fees updated successfully", res);
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);
    }
  }

  async getAllWithdrawReq(payload: any, res: Response) {
    try {
      const { userId } = payload

      const checkBank = await db.withdraws.findAll()
      return commonController.successMessage(checkBank, `All withdraw req`, res);

    } catch (e) {
      return commonController.errorMessage(`${e}`, res);

    }
  }

  async approveWithdrawReq(payload: any, res: Response) {
    try {
      const { userId, id } = payload

      const checkBank = await db.withdraws.findOne(
        {
          where: {
            id
          }
        }
      )
      if (!checkBank) {
        return commonController.errorMessage(`Request not found`, res);

      }
      checkBank.update({
        action: 1
      })

      const check = await db.withdraws.findOne(
        {
          where: {
            id
          }
        }
      )

      return commonController.successMessage(check, `withdraw request is approved`, res);

    } catch (e) {
      return commonController.errorMessage(`${e}`, res);

    }
  }

  async rejectWithdrawReq(payload: any, res: Response) {
    try {
      const { userId, id } = payload

      const checkBank = await db.withdraws.findOne(
        {
          where: {
            id
          }
        }
      )
      if (!checkBank) {
        return commonController.errorMessage(`Request not found`, res);

      }
      checkBank.update({
        action: 2
      })
      const check_balance = await db.wallets.findOne({
        where: {
          userId: checkBank.userId
        }
      })

      check_balance.update({
        amount: parseFloat(checkBank.amount) + parseFloat(check_balance.amount),
        freezeAmount: check_balance.freezeAmount - checkBank.freezeAmt
      })

      const check = await db.withdraws.findOne(
        {
          where: {
            id
          }
        }
      )

      return commonController.successMessage(check, `withdraw request is rejected`, res);

    } catch (e) {
      return commonController.errorMessage(`${e}`, res);

    }
  }
}

async function getFee() {
  const getFee = await db.fees.findOne({
    where: {
      id: 1
    }
  })

  return getFee ? getFee : null
}

async function adminWallet(amount: number) {
  const findUserWallet = await db.wallets.findOne({
    where: {
      userId: 1
    },
  });

  findUserWallet.update({
    amount: parseFloat(findUserWallet.amount) + amount,
  });
}

export default new codeController();
