import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';

export class WebhookLog extends Model {
  public id!: string;
  public webhookId!: string;
  public statusCode!: number;
  public responseBody!: string | null;
  public errorMessage!: string | null;
  public dispatchedAt!: Date;
  public requestBody!: string | null;
  public transactionId!: string | null;
  public readonly deletedAt!: Date;
}

WebhookLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    webhookId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'webhook_id',
      references: {
        model: 'webhooks',
        key: 'id',
      },
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'transaction_id',
    },
    statusCode: {
      type: DataTypes.INTEGER,
      field: 'status_code',
    },
    responseBody: {
      type: DataTypes.TEXT,
      field: 'response_body',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message',
    },
    dispatchedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'dispatched_at',
    },
    requestBody: {
      type: DataTypes.TEXT,
      field: 'request_body',
    },
    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'webhook_logs',
    paranoid: true, // Enable soft deletes
    timestamps: true, // We need timestamps for paranoid to work automatically with destroy()
    // Spec says "dispatched_at (TIMESTAMPTZ)"
    // Typically logs don't need updateAt. created_at is fine.
    // I'll disable standard timestamps and use just dispatchedAt to match spec strictness.
    indexes: [
      {
        fields: ['webhook_id'],
      },
      {
        fields: ['dispatched_at'],
      },
      {
        fields: ['transaction_id'],
      },
    ],
  }
);
