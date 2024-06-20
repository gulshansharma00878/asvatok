"use strict";
import { DateDataType, Model, Sequelize } from "sequelize";

interface UsersAttributes {

  userId: number;
  sku_code: string;
  name: string;
  description: string;
  issue_year: string;
  item_condition: string;
  catagory: string;
  varities: string;
  city: string;
  ruler: string;
  denomination: string;
  signatory: string;
  rarity: string;
  specification: string;
  metal: string;
  remarks: string;
  quantity: string;
  image1: string;
  image2: string;
  image3: string;
  image4: string;
  image5: string;
  custom_url: string;
  video: string;
  current_price: string;
  initial_price: string;
  note: string;
  sold: string;
  type_series: string;
  instock: string;
  keyword: string;
  hidden: boolean;
  approved: boolean
}

module.exports = (sequelize: Sequelize, DataTypes: any) => {
  class Users extends Model<UsersAttributes> implements UsersAttributes {
    userId!: number;
    sku_code!: string;
    name!: string;
    description!: string;
    issue_year!: string;
    item_condition!: string;
    catagory!: string;
    varities!: string;
    city!: string;
    ruler!: string;
    denomination!: string;
    signatory!: string;
    rarity!: string;
    specification!: string;
    metal!: string;
    remarks!: string;
    quantity!: string;
    image1!: string;
    image2!: string;
    image3!: string;
    image4!: string;
    image5!: string;
    custom_url!: string;
    video!: string;
    current_price!: string;
    initial_price!: string;
    note!: string;
    sold!: string;
    type_series!: string;
    instock!: string;
    keyword!: string;
    hidden!: boolean;
    approved!: boolean


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
      sku_code: { type: DataTypes.STRING },
      name: { type: DataTypes.STRING },
      description: { type: DataTypes.STRING },
      issue_year: { type: DataTypes.STRING },
      item_condition: { type: DataTypes.STRING },
      catagory: { type: DataTypes.STRING },
      varities: { type: DataTypes.STRING },
      city: { type: DataTypes.STRING },
      ruler: { type: DataTypes.STRING },
      denomination: { type: DataTypes.STRING },
      signatory: { type: DataTypes.STRING },
      rarity: { type: DataTypes.STRING },
      specification: { type: DataTypes.STRING },
      metal: { type: DataTypes.STRING },
      remarks: { type: DataTypes.STRING },
      quantity: { type: DataTypes.STRING },
      image1: { type: DataTypes.STRING },
      image2: { type: DataTypes.STRING },
      image3: { type: DataTypes.STRING },
      image4: { type: DataTypes.STRING },
      image5: { type: DataTypes.STRING },
      custom_url: { type: DataTypes.STRING },
      video: { type: DataTypes.STRING },
      current_price: { type: DataTypes.STRING },
      initial_price: { type: DataTypes.STRING },
      note: { type: DataTypes.STRING },
      sold: { type: DataTypes.STRING },
      type_series: { type: DataTypes.STRING },
      instock: { type: DataTypes.STRING },
      keyword: { type: DataTypes.STRING },
      hidden: { type: DataTypes.BOOLEAN },
      approved: { type: DataTypes.BOOLEAN },

    },
    {
      sequelize,
      modelName: "products",
    }
  );

  return Users;
};
