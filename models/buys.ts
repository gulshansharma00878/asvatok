"use strict";
import { DateDataType, Model, Sequelize } from "sequelize";

interface UsersAttributes {

  userId: number;
  product_id: string;
  price: string;
  active: number
}

module.exports = (sequelize: Sequelize, DataTypes: any) => {
  class Users extends Model<UsersAttributes> implements UsersAttributes {
    userId!: number;
  product_id!: string;
  price!: string;
  active!: number

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
      price: { type: DataTypes.STRING },
      active: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      modelName: "buys",
    }
  );

  return Users;
};
