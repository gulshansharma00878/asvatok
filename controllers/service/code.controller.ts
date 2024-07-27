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
import Razorpay from "razorpay";
import crypto from "crypto"
import ShortUniqueId from "short-unique-id"
import { clearScreenDown } from "readline";
require('dotenv').config();


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

      if (checkUser) {
        commonController.errorMessage("Email or phone already registered", res);
      } else {
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
        const token = jwt.sign(
          {
            email,
            exp: Math.floor(Date.now() / 1000) + 15 * 60,
          },
          process.env.TOKEN_SECRET
        );

        const verificationLink = `https://asvatok.onrender.com/api/v1/verify?token=${token}`;

        console.log(verificationLink);

        await commonController.sendEmail(
          email,
          "Welcome to the Services",
          `Your verification link ${verificationLink} </br> This link will expire in 15 min.`
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

        const verificationLink = `http://localhost:4000/api/v1/verify?token=${token}`;

        console.log(verificationLink);

        // await commonController.sendEmail(
        //   email,
        //   "Welcome to the Services",
        //   `Your verification link ${verificationLink} </br> This link will expire in 15 min.`
        // );

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
    const { userId, name, address, number, id_num, type, a_front, a_back, pan, pan_back, self_pic, sign } = payload;
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
          userId, name, address, number, id_num, type, a_front, a_back, pan, pan_back, self_pic, sign, accepted: 0
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
          commonController.successMessage({ accepted }, `Kyc status `, res);
        } else {
          commonController.errorMessage(`User not found`, res);
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
        const add_pro = await db.profiles.create({
          userId, aboutMe, pic
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
      const get_data = await MyQuery.query(`select amount ,(select aboutMe from profiles where userId = ${userId}) as aboutMe,
(select pic from profiles where userId = ${userId}) as pic, (select name from users where id = ${userId}) as name ,
(select email from users where id = ${userId}) as email from wallets where userId = ${userId}
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
          id
        }
      })
      const update_user = await db.users.update({ name }, {
        where: {
          id: userId
        }
      })
      commonController.successMessage(update_user, "Profile Data updated", res)
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
        keyword, images, cover_pic, contactNumber, currentQuantity } = payload

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
        hidden: 1, images, approved: 0, cover_pic, contactNumber, currentQuantity
      })
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
            currentQuantity
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
            currentQuantity
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
      a.createdAt,
      a.updatedAt,a.currentQuantity from products a where a.id=${id} `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_product_by_user(payload: any, res: Response) {
    const { userId, id, page } = payload
    try {

      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM products where hidden = 0 and userId = ${userId}`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);

      const offset = page * 10

      let get_data;
      if (page == "-1") {
        get_data = await MyQuery.query(`select id,
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
          createdAt,
          updatedAt,currentQuantity from products where hidden = 0 and userId = ${userId}`, { type: QueryTypes.SELECT })
      } else {
        get_data = await MyQuery.query(`select id,
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
       createdAt,
       updatedAt,currentQuantity from products where hidden = 0 and userId = ${userId}
        LIMIT 10
         OFFSET ${offset}`, { type: QueryTypes.SELECT })
      }
      commonController.successMessage({ get_data, total_pages }, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

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

      if (Number(amount) < 1) {
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

      if(!(parseFloat(check_product.currentQuantity) > 0) ){
        commonController.errorMessage(`The bucket is empty`, res)
        return
      }

      const newSupplyCal = parseFloat(amount) / parseFloat(check_product.initial_price)
      const newSupply = parseFloat(check_product.currentQuantity) - newSupplyCal

      if (newSupplyCal > parseFloat(check_product.currentQuantity)) {
        commonController.errorMessage(`Buying Quantity is greater than Product quantity`, res)
        return
      }

      const update_supply = check_product.update({
        currentQuantity: newSupply
      })

      console.log(check_balance.amount, "cehc", amount);


      if (Number(check_balance.amount) >= Number(amount)) {
        check_balance.update({
          amount: Number(check_balance.amount) - Number(amount)
        })
        const add_request = await db.buys.create({
          userId, product_id, amount, active: 0, quantity: newSupplyCal
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
          views: Number(get_cats.views) + 1
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

      const total_count = await MyQuery.query(`
        SELECT 
          count(*) as count
        FROM products where hidden = 0`, { type: QueryTypes.SELECT });
      const new_count = total_count[0].count
      const total_pages = Math.ceil(new_count / 10);

      const { page } = payload
      const offset = page * 10
      let get_buy;
      if (page == "-1") {

        get_buy = await MyQuery.query(`
          SELECT 
          id, userId,
            name, 
            initial_price,
            cover_pic,
            (SELECT a.name FROM users a WHERE a.id = userId) AS creator 
          FROM products 
          WHERE hidden = 0 ;
        `, { type: QueryTypes.SELECT });
      } else {
        get_buy = await MyQuery.query(`
          SELECT 
           id, userId,
            name, 
            initial_price,
            cover_pic,
            (SELECT a.name FROM users a WHERE a.id = userId) AS creator 
          FROM products 
          WHERE hidden = 0 LIMIT 10
          OFFSET ${offset};
        `, { type: QueryTypes.SELECT });
      }
      const products = get_buy.map((item: any) => ({ ...item }));
      console.log(get_buy, "get_buy");
      console.log(products);

      commonController.successMessage({ products, total_pages }, "All products public", res);
    } catch (e) {
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
            cover_pic,
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
        WHERE hidden = 0
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
        WHERE hidden = 0
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
      const { id, title, writer, timestamp, category, content, cover_image, } = payload;
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
      const deleted = await db.articles.destroy({ where: { id } });
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
      const { userId,quantity,product_id,amount } = payload;

 
      const findUserAssets = await db.user_assets.findOne({
        where: {
          userId,
          product_id
        }
      }) 

      if(!findUserAssets){
        commonController.errorMessage(`No quantity available for this product`, res)
        return
      }

      if(parseFloat(findUserAssets.quantity) < parseFloat(quantity)){
        commonController.errorMessage(`Insufficient quantity`, res)
        return
      }

      const newQuantity = parseFloat(findUserAssets.quantity) - parseFloat(quantity)

      findUserAssets.update({
        quantity:newQuantity
      })

      const newTrade = await db.sell_trades.create({
        userId,
        product_id,
        quantity,
        amount,
        active: 0
      })

      commonController.successMessage(newTrade, " Sell trade created", res);


    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }


  async buy_trade(payload: any, res: Response) {
    try {
      const { userId,quantity,product_id,amount } = payload;
     
      const findUserAssets = await db.wallets.findOne({
        where: {
          userId
        }
      }) 

      const calAmount = parseFloat(amount) * parseFloat(quantity)

      if(parseFloat(findUserAssets.amount)<0){
        commonController.errorMessage(`Balance is less then 1 in your wallet`, res)
        return
      }

      if(parseFloat(findUserAssets.amount) < (calAmount)){
        commonController.errorMessage(`Insufficient Balance for the trade`, res)
        return
      }

      const newBalance = parseFloat(findUserAssets.amount) - (calAmount)

      findUserAssets.update({
        amount:newBalance
      })

      const newTrade = await db.buy_trades.create({
        userId,
        product_id,
        quantity,
        amount,
        active: 0
      })

      commonController.successMessage(newTrade, " buy trade created", res);



    } catch (e) {
      commonController.errorMessage(`${e}`, res);
      console.warn(e, "error");
    }
  }





}

export default new codeController();
