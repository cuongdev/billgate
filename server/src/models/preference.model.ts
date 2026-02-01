import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Preference extends Model {
  public id!: string;
  public sessionId!: string;
  public key!: string;
  public value!: any;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Preference.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for global preferences
      field: 'session_id',
      references: {
        model: 'sessions',
        key: 'id',
      },
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'preferences',
    paranoid: true,
    indexes: [
      {
        fields: ['session_id', 'key'],
        unique: true,
      },
    ],
  }
);
