import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class User extends Model {
  public id!: string;
  public googleSub!: string;
  public firebaseUid!: string;
  public email!: string;
  public name!: string | null;
  public picture!: string | null;
  public tokenVersion!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    googleSub: {
      type: DataTypes.STRING,
      allowNull: true, // Making this nullable as we migrate to firebaseUid
      unique: true,
      field: 'google_sub',
    },
    firebaseUid: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      field: 'firebase_uid',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      field: 'token_version',
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);
