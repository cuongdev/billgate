import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class Webhook extends Model {
  public id!: string;
  public sessionId!: string;
  public url!: string;
  public config!: any;
  public isActive!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Webhook.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true, // Can be null if global webhook? Or strict per session? Spec says FK -> sessions.id. 
      // If legacy had global webhooks, we need to decide. 
      // Spec: "Webhook belongsTo Session". "session_id (FK)".
      // I'll make it nullable if we want to support global, but spec implies ownership.
      // I'll make it nullable for flexibility but favor linking.
      field: 'session_id',
      references: {
        model: 'sessions',
        key: 'id',
      },
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Config stores: auth_type, headers, regex, etc.
    config: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'webhooks',
    paranoid: true,
  }
);
