import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class FCMCredential extends Model {
  public id!: string;
  public keyShare!: string;
  public credentials!: any;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

FCMCredential.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    keyShare: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'key_share',
    },
    credentials: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'fcm_credentials',
    modelName: 'FCMCredential',
    underscored: true,
    paranoid: true, // Soft delete
    timestamps: true,
  }
);
