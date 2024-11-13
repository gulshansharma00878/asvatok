import { Response, Request, response, query } from "express";
import db from "../../models";
import commonController from "../common/common.controller";
import { Sequelize, QueryTypes, Op, json, where, RealDataType } from "sequelize";
import { Encrypt } from "../common/encryptpassword";
const MyQuery = db.sequelize;
const jwt = require("jsonwebtoken");
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
import { promisify } from 'util';
const unlinkAsync = promisify(fs.unlink);
import Razorpay from "razorpay";
import crypto from "crypto"
import ShortUniqueId from "short-unique-id"
import EmailServices from "../../emailServices/emailServices"
require('dotenv').config();
import tradesController from "../TradesController";


const key_id: any = process.env.RAZORPAY_API_KEY
const key_secret: any = process.env.RAZORPAY_API_SECRET
const instance = new Razorpay({
  key_id,
  key_secret
});

class codeController {
  async addUser(payload: any, res: Response) {
    const { email, password, name, mobile } = payload;
    try {
      const checkUser = await db.users.findOne({
        where: {
          [Op.or]: [
            {
              email: {
                [Op.eq]: email,
              },
            },
            // {
            //   mobile: {
            //     [Op.eq]: mobile,
            //   },
            // },
          ],
        },
      });

      if (checkUser && checkUser.active == 1) {
        return commonController.errorMessage("Email or phone already registered", res);
      }

      if (checkUser && checkUser.active == 0) {
        const hash = await Encrypt.cryptPassword(password.toString());

        const insert = await db.users.update({
          email,
          password: hash,
          name,
          mobile,
          active: false,
        }, {
          where: {
            id: checkUser.id
          }
        });

        const token = jwt.sign(
          {
            email,
            exp: Math.floor(Date.now() / 1000) + 15 * 60,
          },
          process.env.TOKEN_SECRET
        );

        const verificationLink = `https://api.asvatok.com/api/v1/verify?token=${token}`;

        console.log(verificationLink);

        const emailFormat = await EmailServices.verificationLink(verificationLink)

        await commonController.sendEmail(
          email,
          "Welcome to Asvatok",
          emailFormat
        );
        return commonController.successMessage(
          email,
          "Link created successfully",
          res
        );
      }

      if (!checkUser) {
        const hash = await Encrypt.cryptPassword(password.toString());
        const insert = await db.users.create({
          email,
          password: hash,
          name,
          mobile,
          active: false,
        });

        const address = commonController.generateOtp()
        await db.wallets.create({
          userId: insert.id,
          address,
          amount: 0,
          wallet: 0,
          active: 1
        })
        await db.profiles.create({
          userId: insert.id,
          pic: "https://avatar.iran.liara.run/public"
        })
        const token = jwt.sign(
          {
            email,
            exp: Math.floor(Date.now() / 1000) + 15 * 60,
          },
          process.env.TOKEN_SECRET
        );

        const verificationLink = `https://api.asvatok.com/api/v1/verify?token=${token}`;

        console.log(verificationLink);

        const emailFormat = await EmailServices.verificationLink(verificationLink)

        await commonController.sendEmail(
          email,
          "Welcome to Asvatok",
          emailFormat
        );

        commonController.successMessage(
          email,
          "Link created successfully",
          res
        );
      }



    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e);
    }
  }

  async resend_email(payload: any, res: Response) {
    try {
      const { email } = payload

      const checkData = await db.users.findOne({
        where: {
          email
        }
      })
      if (checkData) {
        const token = jwt.sign(
          {
            email,
            exp: Math.floor(Date.now() / 1000) + 15 * 60,
          },
          process.env.TOKEN_SECRET
        );

        const verificationLink = `https://api.asvatok.com/api/v1/verify?token=${token}`;

        console.log(verificationLink);

        const emailFormat = await EmailServices.verificationLink(verificationLink)


        await commonController.sendEmail(
          email,
          "Welcome to Asvatok",
          `${emailFormat}`
        );

        commonController.successMessage(
          email,
          "Link created successfully",
          res
        );
      } else {
        commonController.errorMessage("user not found", res)
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async login(payload: any, res: Response) {
    const { email, password } = payload;
    try {
      const checkUser = await db.users.findOne({
        where: {
          email,
        },
      });

      if (checkUser) {
        if (checkUser.active === true) {
          if (
            await Encrypt.comparePassword(
              password.toString(),
              checkUser.password.toString()
            )
          ) {
            const token = jwt.sign(
              {
                id: checkUser.id,
                email: checkUser.email,
                admin: checkUser.admin
              },
              process.env.TOKEN_SECRET
            );
            const checkKyc = await db.kycs.findOne({
              where: {
                userId: checkUser.id
              }
            })

            if (checkKyc) {

              commonController.successMessage(
                { token, kyc_accepted: checkKyc.accepted, email: checkUser.email, name: checkUser.name, mobile: checkUser.mobile, admin: checkUser.admin },
                "Login success",
                res
              );
            } else {
              commonController.successMessage(
                { token, kyc_accepted: 3, email: checkUser.email, name: checkUser.name, mobile: checkUser.mobile, admin: checkUser.admin },
                "Login success",
                res
              );
            }


          } else {
            commonController.errorMessage("Wrong Password", res);
          }
        } else {
          commonController.errorMessage("Not verified", res);
        }

      } else {
        commonController.errorMessage("User Not Registered", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e);
    }
  }

  async kyc(payload: any, res: Response) {
    const { userId, name, address, parseFloat, id_num, type, a_front, a_back, pan, pan_back, self_pic, sign, passBookPic, bankAccNo } = payload;
    try {
      const checkUser = await db.users.findOne({
        where: {
          id: userId,
        },
      });
      if (checkUser) {
        // const checkKyc = await db.kycs.findOne({
        //   where: {
        //     userId
        //   }
        // })
        // if (checkKyc) {
        //   if (checkKyc.rejected == false) {
        //     if (checkKyc.accepted == false) {
        //       commonController.errorMessage(`Kyc acceptation is pending `, res);
        //     } else {
        //       commonController.errorMessage(`Kyc accepted `, res);
        //     }
        //   } else {
        //     commonController.errorMessage(`Kyc is rejected`, res);
        //   }
        // } else {
        const addKyc = await db.kycs.create({
          userId, name, address, parseFloat, id_num, type, a_front, a_back, pan, pan_back, self_pic, sign, accepted: 0, passBookPic, bankAccNo
        })
        commonController.successMessage(addKyc, "Kyc submission completed", res)
        //   }
        // } else {
        //   commonController.errorMessage(`User not found`, res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e);
    }
  }

  async get_kyc_status(payload: any, res: Response) {
    const { userId } = payload
    try {
      const checkUser = await db.users.findOne({
        where: {
          id: userId,
        },
      });
      if (checkUser) {
        const checkKyc = await db.kycs.findOne({
          where: {
            userId
          }
        })
        if (checkKyc) {
          const { accepted } = checkKyc
          commonController.successMessage({ accepted }, `Kyc status`, res);
        } else {
          commonController.successMessage({ accepted: 3 }, `Kyc status`, res);
        }
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e);
    }
  }

  async add_profile(payload: any, res: Response) {
    try {
      const { userId, aboutMe, wallet, pic } = payload

      const checkData = await db.users.findOne({
        where: {
          id: userId
        }
      })
      if (checkData) {
        const add_pro = await db.profiles.update({
          aboutMe, pic, wallet
        }, {
          where: {
            userId
          }
        })
        commonController.successMessage(add_pro, "Profile added", res)
      } else {
        commonController.errorMessage("user not found", res)
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_profile(payload: any, res: Response) {
    const { userId } = payload
    try {
      const get_data = await MyQuery.query(`
SELECT 
    p.aboutMe,
    p.pic,
    u.name,
    u.email,
    SUM(ua.quantity * (pr.current_price - pr.initial_price)) AS profitOrLoss,
    SUM(DISTINCT bu.amount) AS totalInvest
FROM 
    users u 
LEFT JOIN 
    profiles p ON p.userId = u.id
LEFT JOIN
    user_assets ua ON ua.userId =  u.id
LEFT JOIN
    buys bu ON bu.userId = u.id and bu.active = 1
LEFT JOIN
    products pr ON pr.id = ua.product_id
WHERE 
    u.id = ${userId}
GROUP BY 
    p.aboutMe, p.pic, u.name, u.email;

`, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "Profile Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async edit_profile(payload: any, res: Response) {
    const { userId, id, name, aboutMe, wallet, pic } = payload
    try {
      const update_profile = await db.profiles.update({ aboutMe, wallet, pic }, {
        where: {
          userId
        }
      })
      if (name) {
        const update_user = await db.users.update({ name }, {
          where: {
            id: userId
          }
        })
      }
      const data = await db.profiles.findOne({
        where: {
          userId
        }
      })
      commonController.successMessage(data, "Profile Data updated", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)
    }
  }

  async change_password(payload: any, res: Response) {
    const { userId, password, oldPassword } = payload;
    try {
      const getData = await db.users.findOne({
        where: {
          id: userId,
        },
      });
      if (getData) {
        if (
          await Encrypt.comparePassword(
            oldPassword.toString(),
            getData.password.toString()
          )
        ) {
          const hash = await Encrypt.cryptPassword(password.toString());
          await getData.update({
            password: hash,
          });
          commonController.successMessage(
            { changed: true },
            "Password change success",
            res
          );
        } else {
          commonController.errorMessage(`Old password not matched`, res);
        }
      } else {
        commonController.errorMessage(`User error`, res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e);
    }
  }

  async add_product(payload: any, res: Response) {
    try {
      const { userId, addDummyTrade,
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
        initial_price,
        note,
        sold,
        type_series,
        instock,
        keyword, images, cover_pic, contactparseFloat, hidden, approved, ipoQuantity } = payload

      let proId = 0

      const ownerQuantity = parseFloat(quantity) - parseFloat(ipoQuantity)


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
        current_price: initial_price,
        initial_price,
        note,
        sold,
        type_series,
        instock,
        keyword, images,
        hidden, approved, cover_pic, contactparseFloat, currentQuantity: ipoQuantity, ipoQuantity
      })

      if (addDummyTrade === 1) {
        const addDummy = await db.sell_trades.create({
          amount: initial_price,
          active: 3,
          product_id: add_pro.id,
          quantity: 0
        })
      }

      await db.user_assets.create({
        userId,
        product_id: add_pro.id,
        quantity: ownerQuantity,
        active: 0,
      });

      commonController.successMessage(add_pro, "product added", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }


  async get_product(payload: any, res: Response) {
    const { userId, page } = payload;
    try {
      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM products where userId = ${userId}`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);
      const offset = page * 10
      let get_data;
      if (page == "-1") {
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
            updatedAt,
            currentQuantity,
            ipoQuantity
          FROM products
          WHERE userId = ${userId}`, { type: QueryTypes.SELECT });
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
            updatedAt,
            currentQuantity,
            ipoQuantity
          FROM products
          WHERE userId = ${userId}
          LIMIT 10
          OFFSET ${offset}
        `, { type: QueryTypes.SELECT });
      }
      commonController.successMessage({ get_data, total_pages }, "Products Data", res);
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
    }
  }

  async get_product_by_id(payload: any, res: Response) {
    const { userId, id } = payload
    try {
      const get_data = await MyQuery.query(`select a.id,
      a.userId,
      (select name from users where id = a.userId ) as user_name,
      a.sku_code,
      a.name,
      a.description,
      a.issue_year,
      a.item_condition,
      (select b.catName from categories b where b.id = a.category ) as category,
      a.varities,
      a.city,
      a.ruler,
      a.denomination,
      a.signatory,
      a.rarity,
      a.specification,
      a.metal,
      a.remarks,
      a.quantity,
      a.images,
      a.custom_url,
      a.video,
      a.current_price,
      a.initial_price,
      a.note,
      a.sold,
      a.type_series,
      a.instock,
      a.keyword,
      a.cover_pic,
      a.hidden,
      a.approved,
      a.createdAt,a.ipoQuantity,
      a.updatedAt,a.currentQuantity from products a where a.id=${id} `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_product_by_user(payload: any, res: Response) {
    const { userId, id, page } = payload;
    try {
      // Fetch total count of products for the given user
      const total_count = await MyQuery.query(
        `SELECT count(*) as count FROM user_assets WHERE userId = ?`,
        { replacements: [userId], type: QueryTypes.SELECT }
      );

      const new_count = total_count[0].count;
      const total_pages = Math.ceil(new_count / 10);
      const offset = page * 10;

      // Define base query with LEFT JOIN for both cases
      let query = `
        SELECT p.id,
               p.userId,
               p.sku_code,
               p.name,
               p.description,
               p.issue_year,
               p.item_condition,
               (SELECT a.catName FROM categories a WHERE a.id = p.category) AS category,
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
               ua.quantity AS currentQuantity,
               p.ipoQuantity
        FROM user_assets ua
        LEFT JOIN products p ON ua.product_id = p.id
        WHERE ua.userId = ?`;

      // Apply pagination if `page` is not `-1`
      // if (page != "-1") {
      //   query += ` LIMIT 10 OFFSET ?`;
      // }

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
      where x.userId = ${userId}
    `;

      let queryTrades = `SELECT b.id,
      b.userId,
      b.product_id,
      b.totalQuantity as quantity,
      b.amount,
      b.active,
      b.createdAt,
      p.name,
      '1' AS type
 FROM buy_trades b
 left join products p on b.product_id = p.id
WHERE b.userId = ${userId} and  b.active != 3
UNION
SELECT s.id,
      s.userId,
      s.product_id,
     s.totalQuantity as quantity,
      s.amount,
      s.active,
      s.createdAt,
      p.name,
      '2' AS type
 FROM sell_trades s
 left join products p on s.product_id = p.id
WHERE s.userId = ${userId} and s.active != 3

  `;

      const get_buy_requests = await MyQuery.query(fetch_query, {
        type: QueryTypes.SELECT,
      });

      const get_user_trades = await MyQuery.query(queryTrades, { type: QueryTypes.SELECT })


      // Fetch data
      const get_data = await MyQuery.query(query, {
        // replacements: page == "-1" ? [userId] : [userId, offset],
        replacements: [userId],
        type: QueryTypes.SELECT
      });

      commonController.successMessage({ get_data, total_pages, get_buy_requests, get_user_trades }, "Products Data", res);
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
    }
  }

  async buy_request(payload: any, res: Response) {
    const { userId, product_id, amount } = payload
    try {
      const check_balance = await db.wallets.findOne({
        where: {
          userId
        }
      })

      const fee = await getFee()
      if (fee === null) {
        return commonController.errorMessage(`Unable to fetch Fees`, res)
      }

      const buyFee = fee.ipo
      const percentOfAmount = (parseFloat(amount) * parseFloat(buyFee)) / 100;

      if (parseFloat(amount) < 1) {
        commonController.errorMessage(`Min trade amount is 1`, res)
        return
      }

      const check_product = await db.products.findOne({
        where: {
          id: product_id
        }
      })

      if (!check_product) {
        commonController.errorMessage(`Select a product to trade`, res)
        return
      }

      if ((parseFloat(check_product.currentQuantity) == 0)) {
        commonController.errorMessage(`The bucket is empty`, res)
        return
      }

      const newSupplyCal = parseFloat(amount) / parseFloat(check_product.initial_price)
      // const newSupply = parseFloat(check_product.currentQuantity) - newSupplyCal

      console.log(newSupplyCal, "newSupplyCal");
      console.log(parseFloat(check_product.currentQuantity), "currentQuantity");

      if (newSupplyCal > parseFloat(check_product.currentQuantity)) {
        commonController.errorMessage(`Buying Quantity is greater than Product quantity`, res)
        return
      }

      // const update_supply = check_product.update({
      //   currentQuantity: newSupply
      // })

      console.log(check_balance.amount, "cehc", amount);


      if (parseFloat(check_balance.amount) >= parseFloat(amount)) {
        let freezeAmt = parseFloat(amount) + percentOfAmount
        if (check_balance.freezeAmount > 0) {
          freezeAmt = parseFloat(check_balance.freezeAmount) + (parseFloat(amount) + percentOfAmount)
        }
        check_balance.update({
          amount: (parseFloat(check_balance.amount) - parseFloat(amount)) - percentOfAmount,
          freezeAmount: freezeAmt
        })
        const add_request = await db.buys.create({
          userId, product_id, amount, active: 0, quantity: newSupplyCal, fee: buyFee
        })

        commonController.successMessage(add_request, "buy requestI Data", res)
      } else {
        commonController.errorMessage(`insufficient balance`, res)

      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_buy_requests(payload: any, res: Response) {
    const { userId } = payload
    try {
      const get_data = await MyQuery.query(`SELECT buys.*, products.*
      FROM buys
      JOIN products ON buys.product_id = products.id where buys.userId = ${userId}; `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }



  async add_wallet_order(payload: any, res: Response) {
    const { userId, amount } = payload
    try {
      const uid = new ShortUniqueId({ length: 16 });

      let currency = "INR"
      let receiptId = uid.rnd()
      console.log(receiptId, "uid");
      const options = {
        amount: amount * 100,
        currency,
        receipt: receiptId,
        payment_capture: 1,
        notes: {
          userId,
        }
      };

      const order = await instance.orders.create(options);
      if (order) {

        console.log(order, "order");
        const create_order = await db.wallets_histories.create({
          userId,
          order_id: order.id,
          amount,
          receipt: order.receipt,
          order_created_at: order.created_at,
          history_type: 1,
          action: 0,
          item: "none"
        })
        commonController.successMessage({ order, create_order }, "order request Data", res)
      } else {
        commonController.errorMessage("failed to generate order request", res)
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res)
      console.warn(e);

    }
  }

  async get_wallet_balance(payload: any, res: Response) {
    try {
      const { userId } = payload
      const balance = await db.wallets.findOne({
        where: {
          userId
        }
      })
      if (balance) {
        commonController.successMessage(balance, "users wallet data", res)
      }
      else {
        commonController.errorMessage("user wallet not found", res)
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_categories(payload: any, res: Response) {
    try {
      const get_cats = await db.categories.findAll({
      })
      commonController.successMessage(get_cats, "All categories", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_all_categories_public(payload: any, res: Response) {
    try {
      const { page } = payload

      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM categories where active = 1`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);
      const offset = page * 10
      let get_cats;
      if (page == "-1") {
        get_cats = await MyQuery.query(`select * from categories where active = 1  `, { type: QueryTypes.SELECT })

      } else {
        get_cats = await MyQuery.query(`select * from categories where active = 1 limit 10 offset ${offset} `, { type: QueryTypes.SELECT })

      }
      commonController.successMessage({ get_cats, total_pages }, "All categories", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_category_by_id(payload: any, res: Response) {
    const { id } = payload
    try {
      const get_cats = await db.categories.findOne({
        where: {
          id
        }
      })

      if (get_cats) {
        get_cats.update({
          views: parseFloat(get_cats.views) + 1
        })
      }
      commonController.successMessage(get_cats, "All categories", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async add_category(payload: any, res: Response) {
    const { userId, catName, details, image } = payload
    try {
      const get_cats = await db.categories.findOne({
        where: {
          catName
        }
      })
      if (get_cats) {
        commonController.errorMessage("Duplicate category", res)
      } else {
        const add_cats = await db.categories.create({
          userId, catName, details, image, active: false
        })
        commonController.successMessage(add_cats, "All categories", res)
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async purchase_history(payload: any, res: Response) {
    try {
      const { userId } = payload
      const balance = await db.wallets_histories.findAll({
        where: {
          userId
        }
      })
      if (balance) {
        commonController.successMessage(balance, "users wallet history data", res)
      }

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async all_products_public(payload: any, res: Response) {
    try {
      // Fetch total product count for pagination
      const [{ count: new_count }] = await MyQuery.query(
        `SELECT COUNT(*) as count FROM products WHERE hidden = 0`,
        { type: QueryTypes.SELECT }
      );
      const total_pages = Math.ceil(new_count / 10);

      const { page = 0, status } = payload;
      const offset = page * 10;

      let query = `SELECT 
          id, userId,
            name, 
            initial_price,
            current_price,
            cover_pic,case when currentQuantity = 0 then false else true end as ipo,
            (SELECT a.name FROM users a WHERE a.id = userId) AS creator 
          FROM products 
          WHERE hidden = 0 `
      if (status == 0 || status == 1)
        query = `
        SELECT 
          id, 
          userId, 
          name, 
          initial_price, 
          current_price, 
          cover_pic, 
          (current_price - initial_price) AS price_change, 
          (SELECT a.name FROM users a WHERE a.id = userId) AS creator, 
          CASE WHEN currentQuantity = 0 THEN false ELSE true END AS ipo 
        FROM products 
        WHERE hidden = 0 
      `;

      // Modify query based on status
      switch (status) {
        case 0: // Gainers
          query += `ORDER BY price_change DESC LIMIT 10 OFFSET ${offset}`;
          break;
        case 1: // Losers
          query += `ORDER BY price_change ASC LIMIT 10 OFFSET ${offset}`;
          break;
        case 2: // Latest
          query += `ORDER BY id DESC LIMIT 10 OFFSET ${offset}`;
          break
        case 3: // Latest (repetition removed)
          query += `ORDER BY id ASC LIMIT 10 OFFSET ${offset}`;
          break;
        case 4: // Cheapest
          query += `ORDER BY CAST(current_price AS DECIMAL(20, 2)) DESC LIMIT 10 OFFSET ${offset}`;
          break;
        default: // All products (no pagination if page is -1)
          if (page == "-1") {
            query += ``; // No limit or offset
          } else {
            query += `LIMIT 10 OFFSET ${offset}`;
          }
          break;
      }

      // Fetch products
      const products = await MyQuery.query(query, { type: QueryTypes.SELECT });

      // Send response
      return commonController.successMessage({ products, total_pages }, "All products public", res);

    } catch (e) {
      // Handle errors
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }



  async get_product_by_cat(payload: any, res: Response) {
    try {
      const { page } = payload
      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM categories where active = 1`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);
      const offset = page * 10
      let get_cats = await MyQuery.query(`select * from categories where active = 1  `, { type: QueryTypes.SELECT })


      commonController.successMessage({ get_cats, total_pages }, "All categories", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async razor_verify_auth(payload: any, res: Response) {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = payload
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", key_secret)
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;
      if (isAuthentic === true) {
        const updatingPayment = await db.wallethistories.findOne({
          where: {
            order_id: `${razorpay_order_id}`
          }
        })
        if (updatingPayment) {
          updatingPayment.update({
            action: 1
          })
        }
        commonController.successMessage({}, "verification success", res)
      } else {
        commonController.errorMessage("verification failed", res)

      }

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async user_asset_balance(payload: any, res: Response) {
    try {
      const { userId, product_id } = payload
      const assetData = await MyQuery.query(` SELECT 
    ua.userId,ua.product_id,ua.quantity,
    p.current_price,
    p.initial_price,
    COALESCE(b.amount, s.amount, p.initial_price) AS buyingPrice
  FROM 
    user_assets ua
  left JOIN 
    products p ON ua.product_id = p.id
 left join 
	sell_trades s on ua.latestId = s.id and s.active = 1 and ua.userId = s.userId
left join 
	buy_trades b on ua.latestId = b.id and b.active = 1 and ua.userId = b.userId
WHERE 
    ua.userId = ${userId}
    AND ua.product_id = ${product_id}`, { type: QueryTypes.SELECT })
      const asset = assetData[0]
      // if(asset){
      commonController.successMessage(asset, "User assets", res)
      // } else {
      //   commonController.errorMessage("No balance found", res)
      // }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async get_products_by_cat_id(payload: any, res: Response) {
    try {
      const { page, id } = payload
      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM products where category = ${id}`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);
      const offset = page * 10
      let get_cats = await MyQuery.query(` SELECT 
        id,
            name, 
            initial_price,
            cover_pic,case when currentQuantity = 0 then false else true end as ipo,
            (SELECT a.name FROM users a WHERE a.id = userId) AS creator 
         from products where category = ${id}  `, { type: QueryTypes.SELECT })


      commonController.successMessage({ get_cats, total_pages }, "All categories", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async top_gainers(req: any, res: Response) {
    try {
      const gainers = await MyQuery.query(`
        SELECT 
        id,
          name,
          initial_price,
          current_price,
          cover_pic,
          (current_price - initial_price) AS price_change,
          (SELECT a.name FROM users a WHERE a.id = userId) AS creator
        FROM products
        WHERE hidden = 0 and currentQuantity = 0
        ORDER BY price_change DESC
        LIMIT 10;
      `,
        { type: QueryTypes.SELECT });

      const data = gainers.map((item: any) => ({ ...item }));
      console.log(gainers, "gainers");
      console.log(data);

      commonController.successMessage(data, "Top gainers", res);
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async top_losers(req: any, res: Response) {
    try {
      const losers = await MyQuery.query(`
        SELECT 
        id,
          name,
          initial_price,
          current_price,
          cover_pic,
          (current_price - initial_price) AS price_change,
          (SELECT a.name FROM users a WHERE a.id = userId) AS creator
        FROM products
        WHERE hidden = 0 and currentQuantity = 0
        ORDER BY price_change ASC
        LIMIT 10;
      `,
        { type: QueryTypes.SELECT });

      const data = losers.map((item: any) => ({ ...item }));
      console.log(losers, "losers");
      console.log(data);

      commonController.successMessage(data, "Top losers", res);
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async createArticle(payload: any, res: Response) {
    try {
      const { title, writer, timestamp, category, content, cover_image } = payload;
      const article = await db.articles.create({ title, writer, timestamp, category, content, cover_image, active: 1 });
      if (article) {
        commonController.successMessage(article, "Article created successfully", res);
      } else {
        commonController.errorMessage("Failed to create article", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async getAllNonActiveArticles(payload: any, res: Response) {
    try {
      const articles = await db.articles.findAll({ where: { active: false } });
      if (articles.length > 0) {
        commonController.successMessage(articles, "All non-active articles", res);
      } else {
        commonController.errorMessage("No non-active articles found", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
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

  async getAllArticles(payload: any, res: Response) {
    try {
      const articles = await db.articles.findAll();
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

  async getArticleById(payload: any, res: Response) {
    try {
      const { id } = payload;
      const article = await db.articles.findOne({ where: { id } });
      if (article) {
        commonController.successMessage(article, "Article found", res);
      } else {
        commonController.errorMessage("Article not found", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async updateArticle(payload: any, res: Response) {
    try {
      const { id, title, writer, timestamp, category, content, } = payload;
      let { cover_image } = payload
      const checkArticle = await db.articles.findOne({ where: { id } });
      if (!cover_image) {
        cover_image = checkArticle.cover_image
      }

      const [updated] = await db.articles.update(
        { title, writer, timestamp, category, content, cover_image },
        { where: { id } }
      );
      if (updated) {
        const updatedArticle = await db.articles.findOne({ where: { id } });
        commonController.successMessage(updatedArticle, "Article updated successfully", res);
      } else {
        commonController.errorMessage("Article not found", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }

  async deleteArticle(payload: any, res: Response) {
    try {
      const { id } = payload;
      const deleted = await db.articles.update({ active: 0 }, { where: { id } });
      if (deleted) {
        commonController.successMessage(null, "Article deleted successfully", res);
      } else {
        commonController.errorMessage("Article not found", res);
      }
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async sell_trade(payload: any, res: Response) {
    try {
      const { userId, quantity, product_id, price } = payload;
      const findUserAssets = await db.user_assets.findOne({
        where: {
          userId,
          product_id
        }
      })

      const fee = await getFee()
      if (fee === null) {
        return commonController.errorMessage(`Unable to fetch Fees`, res)
      }

      const sellFee = fee.sell
      const percentOfAmount = (parseFloat(price) * parseFloat(sellFee)) / 100;

      if (!findUserAssets) {
        commonController.errorMessage(`No quantity available for this product`, res)
        return
      }
      if (parseFloat(findUserAssets.quantity) < parseFloat(quantity)) {
        commonController.errorMessage(`Insufficient quantity`, res)
        return
      }
      const newQuantity = parseFloat(findUserAssets.quantity) - parseFloat(quantity)
      findUserAssets.update({
        quantity: newQuantity
      })
      const newTrade = await db.sell_trades.create({
        userId,
        product_id,
        quantity,
        amount: price,
        fee: sellFee,
        totalQuantity: quantity,
        active: 0
      })
      commonController.successMessage(newTrade, " Sell trade created", res);
      tradesController.checkAllMatchingTrades()
    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }



  async buy_trade(payload: any, res: Response) {
    try {
      const { userId, quantity, product_id, amount } = payload;

      const findUserAssets = await db.wallets.findOne({
        where: {
          userId
        }
      })


      const fee = await getFee()
      if (fee === null) {
        return commonController.errorMessage(`Unable to fetch Fees`, res)
      }

      const buyFee = fee.buy

      const calAmount = parseFloat(amount) * parseFloat(quantity)
      console.log(calAmount, "calAmount");


      const calAmountFee = (calAmount * parseFloat(buyFee)) / 100;
      console.log(calAmountFee, "calAmountFee");

      const calAmountWithFee = calAmount + calAmountFee
      console.log(calAmountWithFee, "calAmountWithFee");


      if (parseFloat(findUserAssets.amount) <= 0) {
        commonController.errorMessage(`Balance is less then 1 in your wallet`, res)
        return
      }

      if (parseFloat(findUserAssets.amount) < (calAmountWithFee)) {
        commonController.errorMessage(`Insufficient Balance for the trade`, res)
        return
      }

      const newBalance = parseFloat(findUserAssets.amount) - (calAmountWithFee)
      console.log(newBalance, "newBalance");

      let freezeAmt = parseFloat(findUserAssets.freezeAmount) === 0 ? calAmountWithFee : parseFloat(findUserAssets.freezeAmount) + calAmountWithFee
      console.log(freezeAmt, "freezeAmt");

      findUserAssets.update({
        amount: newBalance,
        freezeAmount: freezeAmt
      })

      const newTrade = await db.buy_trades.create({
        userId,
        product_id,
        quantity,
        amount,
        fee: buyFee,
        totalQuantity: quantity,
        active: 0
      })
      commonController.successMessage(newTrade, " buy trade created", res);
      tradesController.checkAllMatchingTrades()

    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async get_trades_by_product_id(payload: any, res: Response) {
    const { userId, id } = payload
    try {

      const get_data = await MyQuery.query(`SELECT b.id,
      b.userId,
      b.product_id,
      b.totalQuantity as quantity,
      b.amount,
      b.active,
      b.createdAt,
      p.name,
      '1' AS type
 FROM buy_trades b
 left join products p on b.product_id = p.id
 WHERE b.product_id = ${id} and b.active != 3
UNION
SELECT s.id,
      s.userId,
      s.product_id,
     s.totalQuantity as quantity,
      s.amount,
      s.active,
      s.createdAt,
      p.name,
      '2' AS type
 FROM sell_trades s
 left join products p on s.product_id = p.id
 WHERE s.product_id = ${id} and s.active != 3
 `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "all trades by product id Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async forgetPassword(payload: any, res: Response) {
    const { email } = payload
    try {

      const checkEmail = await db.users.findOne({
        where: {
          email
        }
      })

      if (!checkEmail) {
        return commonController.errorMessage("Invalid credentials", res)
      }

      const token = jwt.sign(
        {
          email,
          exp: Math.floor(Date.now() / 1000) + 15 * 60,
        },
        process.env.TOKEN_SECRET
      );

      const verificationLink = `https://api.asvatok.com/api/v1/reset-password-form?token=${token}`;

      console.log(verificationLink);

      const emailFormat = await EmailServices.forgetPassword(verificationLink)


      await commonController.sendEmail(
        email,
        "Reset Your Password",
        `${emailFormat}`
      );


      commonController.successMessage({ success: true }, "Link sent to reset password", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)
    }
  }

  async search(payload: any, res: Response) {
    try {
      const { search } = payload

      const get = await MyQuery.query(`SELECT p.*,u.name as creatorName
          FROM products p
           JOIN users u ON p.userId = u.id
          WHERE (p.keyword LIKE '%${search}%'
          OR p.name LIKE '%${search}%')
          or u.name LIKE '%${search}%';
          `, { type: QueryTypes.SELECT })

      commonController.successMessage(get, "Search Data", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async chartData(payload: any, res: Response) {
    try {
      const { productId, type } = payload
      const getDate = new Date();

      let date = getDate.getFullYear() + '-' +
        String(getDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(getDate.getDate()).padStart(2, '0') + ' ' + "00" + '-' + "00" + '-' + "00"
      // String(getDate.getHours()).padStart(2, '0') + '-' +
      // String(getDate.getMinutes()).padStart(2, '0') + '-' +
      // String(getDate.getSeconds()).padStart(2, '0');

      let dateTo3 = getDate.getFullYear() + '-' +
        String(getDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(getDate.getDate()).padStart(2, '0')

      if (type == 0 || type == 1 || type == 2) {
        date = getDate.getFullYear() + '-' +
          String(getDate.getMonth() + 1).padStart(2, '0') + '-' + '01' + ' ' + "00" + '-' + "00" + '-' + "00"
      }

      console.log(date); // Outputs in the format: YYYY-MM-DD HH-mm-ss
      const formattedDate = date.substring(0, 7);
      console.log(formattedDate, "formattedDate");
      const formattedYear = date.substring(0, 4);
      console.log(formattedYear, "formattedYear");
      const year = parseInt(formattedDate.substring(0, 4));
      const previousYear = year - 1; // Calculate the previous year
      // let getData: any[] = []

      const currentDate = new Date();
      const currentFormattedDate = currentDate.toISOString().substring(0, 7); // 'YYYY-MM'
      console.log(currentFormattedDate, "currentFormattedDate");

      let resultDate;
      // if (formattedDate > currentFormattedDate) {
      //   return commonController.errorMessage("Date is greater than current date", res)

      // }

      // if (formattedDate === currentFormattedDate) {
      //   // If the date matches the current month, get today's date in 'YYYY-MM-DD' format
      //   // resultDate =  `CURRENT_DAY('${currentDate.toISOString().substring(0, 10)}'`;
      resultDate = `CURDATE()`
      // } else {
      //   // Otherwise, use the formatted date ('YYYY-MM')

      // }
      // resultDate = `LAST_DAY('${date}')`;

      console.log(resultDate, "resultDate");

      //   if (type == 0) {
      //     const query = `WITH RECURSIVE DateSeries AS (
      //     SELECT '${date}' AS month_year
      //     UNION ALL
      //     SELECT DATE_ADD(month_year, INTERVAL 1 DAY)
      //     FROM DateSeries
      //     WHERE month_year < LAST_DAY('${date}')
      // )
      // SELECT 
      //     ds.month_year, 
      //     COALESCE(st.amount, (
      //         SELECT amount
      //         FROM sell_trades 
      //         WHERE DATE(createdAt) <= ds.month_year
      //           AND product_id = ${productId}
      //           AND active = 1 or active = 3
      //         ORDER BY DATE(createdAt) DESC 
      //         LIMIT 1
      //     )) AS amount
      // FROM 
      //     DateSeries ds
      // LEFT JOIN (
      //     SELECT 
      //         DATE(createdAt) AS month_year, 
      //         MAX(amount) AS amount
      //     FROM 
      //         sell_trades
      //     WHERE 
      //         product_id = ${productId} 
      //         AND active = 1 or active = 3
      //         AND DATE_FORMAT(createdAt, '%Y-%m') = '${formattedDate}'
      //     GROUP BY 
      //         DATE(createdAt)
      // ) st ON ds.month_year = st.month_year
      // ORDER BY ds.month_year;`

      //     console.log(query, "query");
      //     const getData = await MyQuery.query(query, { type: QueryTypes.SELECT })
      //     console.log(getData);
      //     commonController.successMessage(getData, "Chart Data ", res)
      //   }

      if (type == 0) {
        const query = `
      WITH RECURSIVE DateSeries AS (
          SELECT '${date.split(' ')[0]}' AS month_year
          UNION ALL
          SELECT DATE_ADD(month_year, INTERVAL 1 DAY)
          FROM DateSeries
          WHERE month_year < ${resultDate}
      )
      SELECT 
          ds.month_year, 
          CASE
              WHEN ds.month_year < (
                  SELECT MIN(DATE(createdAt)) 
                  FROM sell_trades 
                  WHERE product_id = ${productId}
              ) THEN 0
              ELSE COALESCE(st.amount, (
                  SELECT amount
                  FROM sell_trades 
                  WHERE DATE(createdAt) <= ds.month_year
                    AND product_id = ${productId}
                    AND (active = 1 OR active = 3)
                  ORDER BY DATE(createdAt) DESC
                  LIMIT 1
              ))
          END AS amount
      FROM 
          DateSeries ds
      LEFT JOIN (
          SELECT 
              DATE(createdAt) AS month_year, 
              MAX(amount) AS amount
          FROM 
              sell_trades
          WHERE 
              product_id = ${productId}
              AND (active = 1 OR active = 3)
              AND DATE_FORMAT(createdAt, '%Y-%m') = '${formattedDate}'
          GROUP BY 
              DATE(createdAt)
      ) st ON ds.month_year = st.month_year
      ORDER BY ds.month_year;`

        console.log(query, "query");
        const getData = await MyQuery.query(query, { type: QueryTypes.SELECT });
        console.log(getData);
        commonController.successMessage(getData, "Chart Data", res);
      }
      if (type == 1) {
        const getData = await MyQuery.query(`SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') AS month_year,
        MAX(amount) AS amount
    FROM sell_trades
    WHERE active = 1 or active = 3 
      AND product_id = ${productId} 
      AND YEAR(createdAt) = '${formattedYear}'
    GROUP BY month_year
    ORDER BY month_year;
    `, { type: QueryTypes.SELECT });
        console.log(getData);

        let months: any[]

        if (formattedDate === currentFormattedDate) {
          months = [`${formattedYear}-01`, `${formattedYear}-02`, `${formattedYear}-03`, `${formattedYear}-04`, `${formattedYear}-05`, `${formattedYear}-06`, `${formattedYear}-07`, `${formattedYear}-08`, `${formattedYear}-09`, `${formattedYear}-10`, `${formattedYear}-11`, `${formattedYear}-12`]
          const found = months.find((element) => element === currentFormattedDate);
          const checkIndex = months.indexOf(found)
          months = months.slice(0, checkIndex + 1)
          // const newMonths = months.some(currentFormattedDate)
        } else {
          months = [`${formattedYear}-01`, `${formattedYear}-02`, `${formattedYear}-03`, `${formattedYear}-04`, `${formattedYear}-05`, `${formattedYear}-06`, `${formattedYear}-07`, `${formattedYear}-08`, `${formattedYear}-09`, `${formattedYear}-10`, `${formattedYear}-11`, `${formattedYear}-12`]
        }


        const arr: any[] = []

        // to check amount of previous year last month

        const checkAmount = await MyQuery.query(`SELECT 
          DATE_FORMAT(createdAt, '%Y-%m') AS month_year,
          MAX(amount) AS amount
      FROM sell_trades
      WHERE active = 1 or active = 3 
        AND product_id = ${productId} 
        AND YEAR(createdAt) = '${previousYear}'
      GROUP BY month_year
      ORDER BY month_year;
      `, { type: QueryTypes.SELECT });
        let previousAmo = 0
        if (checkAmount.length > 0) {
          const lastElement = checkAmount[checkAmount.length - 1];
          console.log(lastElement, "lastElement");
          previousAmo = lastElement.amount
        }

        // Loop through all the months in the 'months' array
        months.forEach((month) => {
          // Find if this month exists in the 'getData'
          const match = getData.find((item: any) => item.month_year === month);

          if (match) {
            console.log(`${month} ---> exists in getData`);
            arr.push({ month_year: match.month_year, amount: match.amount });
          } else {
            // If no data is found for this month, use the last known amount or some default value
            const lastKnownAmount = arr.length > 0 ? arr[arr.length - 1].amount : previousAmo; // Assuming 0 if no previous data
            console.log(`${month} ---> does not exist in getData, using last known amount: ${lastKnownAmount}`);
            arr.push({ month_year: month, amount: lastKnownAmount });
          }
        });

        console.log(arr, "newDAta");


        commonController.successMessage(arr, "Chart Data ", res)
      }

      if (type == 3) {

        const resultDate = `CURDATE()`

        const qu = `
          
          WITH RECURSIVE HourSeries AS (
  -- Start generating hours from 00:00 (12:00 AM) to 23:59 (11:59 PM)
  SELECT '${dateTo3} 00:00:00' AS month_year
  UNION ALL
  SELECT DATE_ADD(month_year, INTERVAL 1 HOUR)
  FROM HourSeries
  WHERE month_year < '${dateTo3} 23:00:00' -- Last hour at 11:00 PM
  )
  
  SELECT 
  hs.month_year,
  COALESCE(st.amount, (
      -- Subquery to fetch the last known amount before this hour if no data exists for the hour
      SELECT amount 
      FROM sell_trades 
      WHERE DATE(createdAt) <= '${dateTo3}'
        AND createdAt <= hs.month_year
        AND product_id = ${productId}
        AND active = 1 or active = 3 
      ORDER BY createdAt DESC
      LIMIT 1
  )) AS amount
  FROM 
  HourSeries hs
  LEFT JOIN (
  SELECT 
    DATE_FORMAT(createdAt, '%Y-%m-%d %H:00:00') AS month_year, 
    MAX(amount) AS amount
  FROM 
    sell_trades
  WHERE 
    product_id = ${productId} 
    AND active = 1 or active = 3 
    AND DATE(createdAt) = '${dateTo3}' -- Filter by the specific date
  GROUP BY 
    month_year
  ) st 
  ON hs.month_year = st.month_year
  ORDER BY hs.month_year;
        `
        const getData = await MyQuery.query(qu, { type: QueryTypes.SELECT });

        console.log(qu);

        console.log(getData);
        commonController.successMessage(getData, "Hourly Chart Data ", res);
      }



    } catch (e) {
      console.log(e, "Error");
      commonController.errorMessage(`${e}`, res)

    }
  }

  async tickerPrice(payload: any, res: Response) {
    try {
      const data = await MyQuery.query(` SELECT 
    id,
    name,
    initial_price,
    current_price,
    (current_price - initial_price) AS price_change,
    ((current_price - initial_price) / initial_price) * 100 AS price_change_percentage
FROM 
    products
WHERE 
    hidden = 0 
    AND currentQuantity = 0
ORDER BY 
    price_change_percentage DESC
LIMIT 10;`, { type: QueryTypes.SELECT })
      commonController.successMessage(data, "Tickers", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)
    }
  }

  async assetHolderByProductId(payload: any, res: Response) {
    try {
      const { productId, userId } = payload;

      // Check if KYC is approved for the user
      const kycCheckQuery = `SELECT accepted FROM kycs WHERE userId = :userId`;

      const kycCheck = await MyQuery.query(kycCheckQuery, {
        replacements: { userId },
        type: QueryTypes.SELECT
      });
      console.log(kycCheck);

      if (kycCheck.length == 0) {
        return commonController.successMessage([], "KYC not Submitted", res);
      }

      if (kycCheck.length > 0 && kycCheck[0].accepted != 1) {
        return commonController.successMessage([], "KYC not approved or rejected", res);
      }

      // Fetch user assets based on product ID
      const userAssetsQuery = `
        SELECT 
    ua.userId,
    ua.product_id,
    u.name,
    u.email,
    ua.quantity AS user_quantity,
    p.quantity AS total_quantity,  
    concat(ROUND((ua.quantity / p.quantity) * 100, 2),"%") AS holding_percentage, 
   (ua.quantity * p.current_price) as price
FROM 
    user_assets ua
JOIN 
    products p  
ON 
    ua.product_id = p.id  
left join
users u on ua.userId = u.id
WHERE 
    ua.product_id = ${productId}
      `;
      const userAssets = await MyQuery.query(userAssetsQuery, {
        replacements: { productId },
        type: QueryTypes.SELECT
      });

      // Return success message with the fetched data
      return commonController.successMessage(userAssets, "Data retrieved successfully", res);

    } catch (error) {
      // Handle any errors
      return commonController.errorMessage(`${error}`, res);
    }
  }

  async getFees(payload: any, res: Response) {
    try {
      const feesData = await db.fees.findOne({
        where: { id: 1 }
      })
      return commonController.successMessage(feesData, "Data retrieved successfully", res);
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);

    }
  }

  async getAssetPercentage(payload: any, res: Response) {
    try {
      const { productId } = payload

      if (!productId) {
        return commonController.errorMessage(`Please provide product id`, res);

      }
      const data = await MyQuery.query(`SELECT 
    ua.userId,
    ua.product_id,
    u.name,
    u.email,
    ua.quantity AS user_quantity,
    p.quantity AS total_quantity,  -- The total quantity of the product from the products table
    concat(ROUND((ua.quantity / p.quantity) * 100, 2),"%") AS holding_percentage, 
   (ua.quantity * p.current_price) as price
FROM 
    user_assets ua
JOIN 
    products p  
ON 
    ua.product_id = p.id  
left join
users u on ua.userId = u.id
WHERE 
    ua.product_id = ${productId}`, { type: QueryTypes.SELECT })
      return commonController.successMessage(data, "All asset holders data by %", res)
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);

    }
  }

  async addBankAccount(payload: any, res:Response){
    const {userId,
      name,
      accountNumber,
      ifscCode,
      accountType,
      bankName,
      bankBranch, } = payload

    try {
      const checkBank = await db.bankdetails.findOne({
        where:{
          userId,
          accountNumber,
          active: 1
        }
      })
      if(checkBank){
        return commonController.errorMessage(`Account Number already exist`, res);
      }
      const addBank = await db.bankdetails.create({
        userId,
        name,
        accountNumber,
        ifscCode,
        accountType,
        bankName,
        bankBranch,
        active: 1
      })
      return commonController.successMessage(addBank, "Bank details added", res)
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);
      
    }
  }

  async getUserBankAcc(payload: any, res:Response){
    try {
      const {userId } = payload

      const checkBank = await db.bankdetails.findAll({
        where:{
          userId,
          active: 1
        }
      })
      return commonController.successMessage(checkBank,`Bank details`, res);
      
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);
      
    }
  }

  async addWithdrawRequest(payload: any, res:Response){
    try {
      const {userId,amount,bankId } = payload

      const fee = await getFee()
      if (fee === null) {
        return commonController.errorMessage(`Unable to fetch Fees`, res)
      }

      const check_balance = await db.wallets.findOne({
        where: {
          userId
        }
      })

      if(parseFloat(check_balance.amount)<=0){
        commonController.errorMessage(`Balance is less then 1 in your wallet`, res)
        return
      }

      if(parseFloat(check_balance.amount)<parseFloat(amount)){
        commonController.errorMessage(`Balance is less then withdraw amount`, res)
        return
      }
      const withdrawFee = fee.withdraw

      const calAmountFee = (amount * parseFloat(withdrawFee)) / 100;
      console.log(calAmountFee, "calAmountFee");

      const calAmountWithFee = amount + calAmountFee
      console.log(calAmountWithFee, "calAmountWithFee");

      const newBalance = parseFloat(check_balance.amount) - (calAmountWithFee)
      console.log(newBalance, "newBalance");

      let freezeAmt = parseFloat(check_balance.freezeAmount) === 0 ? calAmountWithFee : parseFloat(check_balance.freezeAmount) + calAmountWithFee
      console.log(freezeAmt, "freezeAmt");

      check_balance.update({
        amount: newBalance,
        freezeAmount: freezeAmt
      })

      const checkBank = await db.withdraws.create({
        where:{
          userId,
          amount,
          amountWithFee: calAmountWithFee,
          fee: withdrawFee,
          freezeAmt,
          bankId
        }
      })
      return commonController.successMessage(checkBank,`Bank details`, res);
      
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);
      
    }
  }

  async getUserWithdraws(payload: any, res:Response){
    try {
      const {userId } = payload

      const checkBank = await db.withdraws.findAll({
        where:{
          userId
        }
      })
      return commonController.successMessage(checkBank,`All withdraw reqs`, res);
      
    } catch (e) {
      return commonController.errorMessage(`${e}`, res);
      
    }
  }

  //     const getData = await MyQuery.query(`WITH RECURSIVE DateSeries AS (
  //       SELECT '${date}' AS month_year
  //       UNION ALL
  //       SELECT DATE_ADD(month_year, INTERVAL 1 DAY)
  //       FROM DateSeries
  //       WHERE month_year < LAST_DAY('${date}')
  //   )
  //   SELECT 
  //       ds.month_year, 
  //       COALESCE(st.amount, (
  //           SELECT amount 
  //           FROM sell_trades 
  //           WHERE DATE(updatedAt) <= ds.month_year
  //             AND product_id = ${productId}
  //             AND active = 1
  //           ORDER BY DATE(updatedAt) DESC 
  //           LIMIT 1
  //       )) AS amount
  //   FROM 
  //       DateSeries ds
  //   LEFT JOIN (
  //       SELECT 
  //           DATE(updatedAt) AS month_year, 
  //           MAX(amount) AS amount
  //       FROM 
  //           sell_trades
  //       WHERE 
  //           product_id = ${productId} 
  //           AND active = 1
  //           AND DATE_FORMAT(updatedAt, '%Y-%m') = '${formattedDate}'
  //       GROUP BY 
  //           DATE(updatedAt)
  //   ) st ON ds.month_year = st.month_year
  //   ORDER BY ds.month_year;
  // `, { type: QueryTypes.SELECT })





  //       getData = await MyQuery.query(`WITH RECURSIVE date_sequence AS (
  //     -- Generate a sequence of dates from the minimum to the maximum date in sell_trades for the given conditions
  //     SELECT 
  //         MIN(DATE(updatedAt)) AS month_year
  //     FROM 
  //         sell_trades
  //     WHERE 
  //         product_id = '${productId}'  
  //         AND active = 1
  //     UNION ALL
  //     SELECT 
  //         DATE_ADD(month_year, INTERVAL 1 DAY)
  //     FROM 
  //         date_sequence
  //     WHERE 
  //         month_year < (
  //             SELECT 
  //                 MAX(DATE(updatedAt)) 
  //             FROM 
  //                 sell_trades 
  //             WHERE 
  //                 product_id = '${productId}' 
  //                 AND active = 1
  //         )
  // ),
  // max_amounts AS (
  //     SELECT 
  //         DATE(updatedAt) AS month_year, 
  //         MAX(amount) AS amount
  //     FROM 
  //         sell_trades
  //     WHERE 
  //         product_id = '${productId}' 
  //         AND active = 1
  //     GROUP BY 
  //         DATE(updatedAt)
  // )
  // SELECT 
  //     ds.month_year,
  //     COALESCE(ma.amount, (
  //         SELECT amount
  //         FROM max_amounts
  //         WHERE month_year <= ds.month_year
  //         ORDER BY month_year DESC
  //         LIMIT 1
  //     )) AS amount
  // FROM 
  //     date_sequence ds
  // LEFT JOIN 
  //     max_amounts ma 
  // ON 
  //     ds.month_year = ma.month_year
  // ORDER BY 
  //     ds.month_year ASC;
  // `, { type: QueryTypes.SELECT })


}


async function getFee() {
  const getFee = await db.fees.findOne({
    where: {
      id: 1
    }
  })

  return getFee ? getFee : null
}
export default new codeController();
