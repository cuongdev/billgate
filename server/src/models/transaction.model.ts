import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../db/sequelize';
import { Session } from './session.model';

export class Transaction extends Model {
  public id!: string;
  public sessionId!: string;
  public amountValue!: number; // Stored as NUMERIC but JS sees number/string depending on config
  public currency!: string;
  public transactionDate!: Date;
  public note!: string | null;
  public rawPayload!: any;
  public senderAccount!: string | null;
  public hasAudio!: boolean;
  public audioUrl!: string | null;

  public bankTransactionId!: string | null;
  public session?: Session;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;
}

Transaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'session_id',
      references: {
        model: 'sessions',
        key: 'id',
      },
    },
    // Adding this to store the actual Bank ID since PK is now UUID
    bankTransactionId: {
      type: DataTypes.STRING,
      allowNull: true, 
      field: 'bank_transaction_id'
    },
    amountValue: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'amount_value',
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'VND',
    },
    transactionDate: {
      type: DataTypes.DATE, // TIMESTAMPTZ
      allowNull: false,
      field: 'transaction_date',
    },
    note: {
      type: DataTypes.TEXT,
    },
    senderAccount: {
        type: DataTypes.STRING,
        field: 'sender_account'
    },
    hasAudio: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_audio'
    },
    audioUrl: { 
        type: DataTypes.TEXT,
        field: 'audio_url'
    },
    rawPayload: {
      type: DataTypes.JSONB,
      field: 'raw_payload',
    },
  },
  {
    sequelize,
    tableName: 'transactions',
    paranoid: true,
    indexes: [
      {
        fields: ['session_id', { name: 'transaction_date', order: 'DESC' }],
      },
      {
          fields: ['bank_transaction_id'],
          unique: true
      }
    ],
  }
);
