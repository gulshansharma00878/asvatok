"use strict";
import { DateDataType, Model, Sequelize } from "sequelize";

interface UsersAttributes {

  userId: number;
  product_id: string;
  amount: string;
  active: number
  reason: string
  
}

module.exports = (sequelize: Sequelize, DataTypes: any) => {
  class Users extends Model<UsersAttributes> implements UsersAttributes {
    userId!: number;
  product_id!: string;
  amount!: string;
  active!: number
  reason!: string


    static associate(models: any) {
      // Define associations here
      // Users.belongsTo(models.packages, { foreignKey: 'packageId' });
      // Users.belongsTo(models.company_registrations, { foreignKey: 'companyId' });
      // Users.belongsTo(models.roles, { foreignKey: 'roleId' });
    }
  }

  Users.init(
    {
      userId:{ type: DataTypes.INTEGER },
      product_id: { type: DataTypes.STRING },
      amount: { type: DataTypes.STRING },
      active: { type: DataTypes.INTEGER },
      reason: { type: DataTypes.STRING },

    },
    {
      sequelize,
      modelName: "buys",
    }
  );

  return Users;
};
