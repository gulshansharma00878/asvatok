"use strict";
import { Model, Sequelize, DataTypes } from "sequelize";

interface ArticleAttributes {
  title: string;
  writer: string;
  timestamp: string;
  category: string;
  content: string;
  cover_image: string;
  active: boolean;
}

module.exports = (sequelize: Sequelize) => {
  class Article extends Model<ArticleAttributes> implements ArticleAttributes {
    title!: string;
    writer!: string;
    timestamp!: string;
    category!: string;
    content!: string;
    cover_image!: string;
    active!: boolean;

    static associate(models: any) {
      // Define associations here if needed
    }
  }

  Article.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      writer: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      cover_image: {
        type: DataTypes.STRING,
        allowNull: true, // Assuming cover_image can be optional
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Assuming articles are active by default
      },
    },
    {
      sequelize,
      modelName: "articles",
      tableName: "articles", // Specify the table name
      timestamps: false, // Disable automatic timestamps (createdAt, updatedAt)
    }
  );

  return Article;
};
