import { Session } from './session.model';
import { Transaction } from './transaction.model';
import { Webhook } from './webhook.model';
import { WebhookLog } from './webhook-log.model';
import { Preference } from './preference.model';
import { User } from './user.model';
import { FCMCredential } from './fcm-credential.model';

// Associations
Session.hasMany(Transaction, { foreignKey: 'sessionId', as: 'transactions' });
Transaction.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

Session.hasMany(Webhook, { foreignKey: 'sessionId', as: 'webhooks' });
Webhook.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

Session.hasMany(Preference, { foreignKey: 'sessionId', as: 'preferences' });
Preference.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

Webhook.hasMany(WebhookLog, { foreignKey: 'webhookId', as: 'logs' });
WebhookLog.belongsTo(Webhook, { foreignKey: 'webhookId', as: 'webhook' });

User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  Session,
  Transaction,
  Webhook,
  WebhookLog,
  Preference,
  User
};
