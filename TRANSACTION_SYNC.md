# Feature: Fetch and Save Transactions from VPBank API

## Overview

This feature provides functionality to automatically fetch and store bank transactions from VPBank API into the database, with capabilities for:
- Automatic synchronization of new transactions from VPBank
- Idempotency assurance (avoiding duplicate transactions)
- **Resilience**: Handling errors for individual transactions independently, ensuring the batch does not crash due to a single malformed transaction.
- Real-time notification via WebSocket
- Handling authentication errors and edge cases
- Integration with Temporal Workflow for asynchronous processing

## Purpose

The system needs to automatically track and store bank transactions from VPBank to:
- Provide transaction history for users
- Trigger webhooks when new transactions occur
- Display real-time notifications on the frontend
- Analyze and generate transaction statistics

## Architecture

### Main Components

1. **Activity**: `fetchAndSaveTransactions` in `account.activities.ts`
   - Called from Temporal Workflow
   - Handles the entire flow from API call to database storage

2. **Service**: `VpbankService` (`syncTransactions`)
   - Executes core logic: parse, validate, save to DB, emit socket event.

3. **Repository**: `TransactionRepository`
   - Manages CRUD operations for transactions
   - Supports search, filtering, and pagination

4. **Model**: `Transaction`
   - Sequelize model with fields: `bankTransactionId`, `amountValue`, `currency`, `transactionDate`, `note`, etc.

5. **Workflow Integration**: `VPBankAccountWorkflow`
   - Orchestrates fetching transactions upon receiving FCM events
   - Triggers webhook dispatch after new transactions are found

## Workflow

```
[ FCM Event ]
(New Transaction)
      |
      v
[ Temporal Workflow ]
      |
      v
[ fetchAndSaveTransactions Activity ]
      |
      v
[ VpbankService.syncTransactions ]
      |
      |-- 1. Call VPBank API (getNotifications)
      |
      |-- 2. Parse response -> List<RawString>
      |
      |-- 3. Loop each Item:
      |     [ TRY ]
      |       a. Parse Money, Date, Note
      |       b. Generate MD5 ID
      |       c. Check DB (findByBankId)
      |       d. If !exist -> Save DB
      |     [ CATCH ]
      |       - Log Error
      |       - Continue to next item
      |
      |-- 4. Emit Socket Event (if new > 0)
      |
      |-- 5. Return { newTransactions, status }
```

## Implementation Details

### 1. API Call

```typescript
const res = await vpbankApi.getNotifications(
  session.jwt,
  session.keyShare,
  session.pinShare,
  session.accountNumber || 'all'
);
```

**Response format:**
```json
{
  "d": {
    "Message": "{\"key1\": [\"VPB:26/01/2026 23:11|123456|500,000VND|...|note\"]}"
  }
}
```

### 2. Parse Transaction Data

Format of each transaction string:
```
VPB:DD/MM/YYYY HH:mm|accountNumber|amountCurrency|...|note
```

**Example:**
```
VPB:26/01/2026 23:11|1234567890|500,000VND|...|Transfer from ABC
```

### 3. Date Parsing

Date format from VPBank: `"26/01/2026 23:11"` (DD/MM/YYYY HH:mm)

**Processing:**
- Split date and time.
- Create Javascript `Date` object (Note: VPBank returns local time, server needs to handle timezone appropriately if needed; currently parsing as local time of the container).

### 4. Resilience & Error Handling

To ensure the synchronization process is not interrupted by a faulty transaction (e.g., strange format, or race condition):

**Batch Isolation:**
The entire processing logic for each transaction is wrapped in a loop with `try/catch`:

```typescript
for (const itemStr of allItems) {
  try {
     // 1. Parse Logic
     // 2. DB Check & Save
  } catch (e: any) {
     if (e.name === 'SequelizeUniqueConstraintError') {
       console.log('[Sync] Skipped duplicate:', id);
     } else {
       console.error('[Sync] Error processing item:', itemStr, e);
     }
     // DO NOT THROW ERROR -> Continue to next item
  }
}
```

This allows the system to:
1. **Self-heal**: Automatically skip malformed records.
2. **Robust Idempotency**: If two requests run in parallel, the DB Constraint will block duplicates, and the code will catch this error and treat it as a success (skip).

### 5. Idempotency

The system uses an **MD5 hash** of the entire raw transaction string as the `bankTransactionId`.

**Assurance Flow:**
1. Check `transactionRepo.find({ bankTransactionId })`.
2. If not found -> call `save()`.
3. Database `UNIQUE INDEX` on `bankTransactionId` serves as the final guard.

### 6. Real-time Notification

After saving new transactions, the system emits a socket event to notify the frontend:

```typescript
await fetch(`${apiBaseUrl}/api/internal/socket-emit`, { ... });
```

Event: `vpbank:transaction`
Data: `{ payload: { newTransactions: [...] } }`

## Error Handling

### 1. Authentication Errors
If API returns 401/Unauthorized -> return status `AUTH_FAILED`. The workflow will know to pause or notify the user.

### 2. Validation Errors
If the response is not in correct JSON format -> return `SUCCESS` (assume no new transactions) but log a warning.

## Database Schema

### Transaction Model

```typescript
{
  id: UUID (PK)
  sessionId: UUID (FK -> sessions.id)
  bankTransactionId: STRING (unique index)
  amountValue: DECIMAL(18, 2)
  currency: STRING(3) // 'VND', 'USD', etc.
  transactionDate: TIMESTAMPTZ
  note: TEXT
  senderAccount: STRING
  hasAudio: BOOLEAN
  audioUrl: TEXT
  rawPayload: JSONB
  createdAt: TIMESTAMPTZ
  updatedAt: TIMESTAMPTZ
  deletedAt: TIMESTAMPTZ (soft delete)
}
```

## Security

- **Session Validation**: Always verify the session exists in DB before saving.
- **Idempotency**: MD5 hash ensures integrity of the transaction ID.

## Deployment Notes

### Environment Variables

```bash
API_INTERNAL_URL=http://vpbank-server:3000  # For socket emit
```

### Database Migration

Ensure indexes are created:
```sql
CREATE UNIQUE INDEX transactions_bank_transaction_id_unique 
  ON transactions(bank_transaction_id);
```

## Developer Checklist

- [x] Catch `SequelizeUniqueConstraintError` to avoid batch crash.
- [x] Check `status` returned from activity to handle subsequent logic (Success/Error/AuthFailed).
- [x] Ensure `socket-emit` does not fail the transaction flow if parameters are incorrect.
