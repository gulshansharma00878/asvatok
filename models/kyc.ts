"use strict";
import { DateDataType, Model, Sequelize } from "sequelize";

interface UsersAttributes {
  userId: number;
  a_front: string;
  a_back: string;
  pan: string;
  sign: string;
  accepted: boolean;
  rejected: boolean;
}

module.exports = (sequelize: Sequelize, DataTypes: any) => {
  class Users extends Model<UsersAttributes> implements UsersAttributes {
    userId!: number;
    a_front!: string;
    a_back!: string;
    pan!: string;
    sign!: string;
    accepted!: boolean;
    rejected!: boolean;

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
      a_front: { type: DataTypes.STRING },
      a_back: { type: DataTypes.STRING },
      pan: { type: DataTypes.STRING },
      sign: { type: DataTypes.STRING },
      accepted: { type: DataTypes.BOOLEAN },
      rejected: { type: DataTypes.BOOLEAN },
    },
    {
      sequelize,
      modelName: "kycs",
    }
  );

  return Users;
};
