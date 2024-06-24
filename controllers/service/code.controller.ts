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
          userId:insert.id,
          address,
          amount:0,
          wallet:0,
          active:1
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
                { token, kyc_accepted: checkKyc.accepted, email: checkUser.email, name: checkUser.name, mobile: checkUser.mobile },
                "Login success",
                res
              );
            } else {
              commonController.successMessage(
                { token, kyc_accepted: 3, email: checkUser.email, name: checkUser.name, mobile: checkUser.mobile },
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
          userId, aboutMe, wallet, pic
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
      const get_data = await MyQuery.query(`select * ,(select email from users where id = ${userId}) as email, 
      (select name from users where id = ${userId}) as name
       from profiles where userId = ${userId}`, { type: QueryTypes.SELECT })
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
        catagory,
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
      const get_catname = await db.catagorioes.findOne({
        where: {
          id: catagory
        }
      })
      const auto_sku = `${get_catname.name}/${name}/${userId}`


      const add_pro = await db.products.create({
        userId, sku_code: auto_sku,
        name,
        description,
        issue_year,
        item_condition,
        catagory,
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
        hidden: 1, images, approved: 0, cover_pic
      })
      commonController.successMessage(add_pro, "Profile added", res)

    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }


  async get_product(payload: any, res: Response) {
    const { userId } = payload
    try {
      const get_data = await MyQuery.query(`select * from products where hidden = 0`, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async get_product_by_id(payload: any, res: Response) {
    const { userId,id } = payload
    try {
      const get_data = await MyQuery.query(`select * from products where id=${id} `, { type: QueryTypes.SELECT })
      commonController.successMessage(get_data, "products Data", res)
    } catch (e) {
      commonController.errorMessage(`${e}`, res)

    }
  }

  async buy_request(payload: any, res: Response) {
    const { userId, product_id, quantity, price } = payload
    try {
      const add_request = await db.buys.create({
        userId, product_id, quantity, price, active: 0
      })
      commonController.successMessage(add_request, "products Data", res)
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

}

  export default new codeController();
