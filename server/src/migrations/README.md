# Database Migrations

This directory contains database migration files for the BillGate VPBank integration system.

## Files

- **`20260201000000-init-database.js`**: Consolidated migration that creates all tables with final schema
- **`init.sql`**: SQL script for direct database initialization (alternative to migrations)

## Reset Database & Run Migrations

### Option 1: Using Sequelize CLI (Recommended)

```bash
# Navigate to server directory
cd server

# Drop all tables and reset database
npx sequelize-cli db:migrate:undo:all

# Run the new consolidated migration
npx sequelize-cli db:migrate
```

### Option 2: Using init.sql directly

```bash
# Connect to PostgreSQL
psql -U your_username -d your_database_name

# Drop existing database (CAUTION: This will delete all data!)
DROP DATABASE IF EXISTS billgate;
CREATE DATABASE billgate;

# Connect to new database
\c billgate

# Run init script
\i /path/to/server/src/migrations/init.sql
```

### Option 3: Docker/Production Reset

```bash
# Stop containers
docker-compose down

# Remove volumes to delete database data
docker-compose down -v

# Start fresh
docker-compose up -d

# Run migrations
docker-compose exec server npx sequelize-cli db:migrate
```

## Database Schema

### Tables Created

1. **users** - User accounts (Google OAuth / Firebase Auth)
2. **sessions** - VPBank account connections (key_share, pin_share)
3. **fcm_credentials** - FCM push notification credentials
4. **transactions** - Bank transactions from VPBank Neo
5. **webhooks** - Webhook configurations for notifications
6. **webhook_logs** - Audit log of webhook dispatches
7. **preferences** - User preferences and settings

### Key Features

- UUID primary keys
- Soft deletes (deleted_at column)
- Foreign key constraints with CASCADE
- Optimized indexes for queries
- JSONB columns for flexible configuration
- Timestamp tracking (created_at, updated_at)