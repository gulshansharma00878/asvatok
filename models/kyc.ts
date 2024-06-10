"use strict";
import { DateDataType, Model, Sequelize } from "sequelize";

interface UsersAttributes {
  userId: number;
  name: string;
  number: string;
  address: string;
  id_num: string;
  type: string;
  a_front: string;
  a_back: string;
  pan: string;
  pan_back: string;
  self_pic: string;
  sign: string;
  accepted: number;
}

module.exports = (sequelize: Sequelize, DataTypes: any) => {
  class Users extends Model<UsersAttributes> implements UsersAttributes {
    userId!: number;
    name!: string;
    number!: string;
    address!: string;
    id_num!: string;
    type!: string;
    a_front!: string;
    a_back!: string;
    pan!: string;
    pan_back!: string;
    self_pic!: string;
    sign!: string;
    accepted!: number;

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
      name: { type: DataTypes.INTEGER },
      number: { type: DataTypes.INTEGER },
      address: { type: DataTypes.INTEGER },
      id_num: { type: DataTypes.INTEGER },
      type: { type: DataTypes.INTEGER },
      a_front: { type: DataTypes.INTEGER },
      a_back: { type: DataTypes.INTEGER },
      pan: { type: DataTypes.INTEGER },
      pan_back: { type: DataTypes.INTEGER },
      self_pic: { type: DataTypes.INTEGER },
      sign: { type: DataTypes.STRING },
      accepted: { type: DataTypes.INTEGER },
    },
    {
      sequelize,
      modelName: "kycs",
    }
  );

  return Users;
};
