import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Session extends Model {
  public id!: string;
  public keyShare!: string;
  public pinShare!: string;
  public jwt!: string | null;
  public accountNumber!: string;
  public status!: 'active' | 'expired' | 'paused';
  public name!: string | null;
  public lastListenerActivity!: number | null;
  public runId!: string | null;

  // Foreign Key
  public userId!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Session.init(
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
    pinShare: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'pin_share',
    },
    jwt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true, // Can be null initially before sync
      field: 'account_number',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'paused'),
      defaultValue: 'active',
      allowNull: false,
    },
    lastListenerActivity: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'last_listener_activity',
    },
    runId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'run_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Temporarily allow null until migration logic is tighter or data wiped.
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'sessions',
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['account_number'],
      },
    ],
  }
);
