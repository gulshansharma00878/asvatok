"use strict";
import { DateDataType, Model, Sequelize } from "sequelize";

interface UsersAttributes {
  userId: number;
  history_type: string;
  amount: string;
  action: boolean;
  item: string;
}

module.exports = (sequelize: Sequelize, DataTypes: any) => {
  class Users extends Model<UsersAttributes> implements UsersAttributes {
    userId!: number;
  history_type!: string;
  amount!: string;
  action!: boolean;
  item!: string;

    static associate(models: any) {
      // Define associations here
      // Users.belongsTo(models.packages, { foreignKey: 'packageId' });
      // Users.belongsTo(models.company_registrations, { foreignKey: 'companyId' });
      // Users.belongsTo(models.roles, { foreignKey: 'roleId' });
    }
  }

  Users.init(
    {
      userId: { type: DataTypes.INTEGER },
      history_type: { type: DataTypes.STRING },
      amount: { type: DataTypes.STRING },
      action: { type: DataTypes.BOOLEAN },
      item: { type: DataTypes.STRING },
    },
    {
      sequelize,
      modelName: "wallets_histories",
    }
  );

  return Users;
};
