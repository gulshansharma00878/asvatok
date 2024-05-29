import { Response, Request } from "express";
import db from "../../models";
import commonController from "../common/common.controller";
import { Sequelize, QueryTypes, Op, json } from "sequelize";
import { Encrypt } from "../common/encryptpassword";
const MyQuery = db.sequelize;
const jwt = require("jsonwebtoken");

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
            {
              mobile: {
                [Op.eq]: mobile,
              },
            },
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

        const token = jwt.sign(
          {
            email,
            exp: Math.floor(Date.now() / 1000) + 15 * 60,
          },
          process.env.TOKEN_SECRET
        );

        const verificationLink = `https://asvatok.onrender.com/api/v1/verify?token=${token}`;

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
        if (checkUser.active == true) {
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
            const checkNewData = await db.company_registrations.findOne({
              where: {
                userId: checkUser.id,
              },
            });
            if (checkNewData || checkUser.companyId) {
              commonController.successMessage(
                { token, companyRegistrated: true, verify: true },
                "Login success",
                res
              );
            } else {
              commonController.successMessage(
                { token, companyRegistrated: false, verify: true },
                "Login success",
                res
              );
            }
          } else {
            commonController.errorMessage("Wrong Password", res);
          }
        } else {
          if (
            await Encrypt.comparePassword(
              password.toString(),
              checkUser.password.toString()
            )
          ) {
            const checkOtp = await db.userotps.findOne({
              where: {
                userId: checkUser.id,
              },
            });
            var otp = commonController.generateOtp();
            console.log(otp);
            await checkOtp.update({
              otpValue: otp,
            });

            await commonController.sendEmail(
              email,
              "Welcome to the Services",
              `Your verification otp is ${otp}`
            );

            const checkNewData = await db.company_registrations.findOne({
              where: {
                userId: checkUser.id,
              },
            });
            if (checkNewData || checkUser.companyId) {
              commonController.successMessage(
                { companyRegistrated: true, verify: false },
                "Login success",
                res
              );
            } else {
              commonController.successMessage(
                { companyRegistrated: false, verify: false },
                "Login success",
                res
              );
            }
          } else {
            commonController.errorMessage("Wrong Password", res);
          }
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
    const { userId, a_front, a_back, pan, sign } = payload;
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
          if (checkKyc.rejected == false) {
            if (checkKyc.accepted == false) {
              commonController.errorMessage(`Kyc acceptation is pending `, res);
            } else {
              commonController.errorMessage(`Kyc accepted `, res);
            }
          } else {
            commonController.errorMessage(`Kyc is rejected`, res);
          }
        } else {
          const addKyc = await db.kycs.create({
            userId, a_front, a_back, pan, sign, rejected: false, accepted: false
          })
          commonController.successMessage(addKyc, "Kyc submission completed", res)
        }
      } else {
        commonController.errorMessage(`User not found`, res);
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
          userId
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
      commonController.successMessage({}, "Profile Data updated", res)
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
}

export default new codeController();
