# Database Setup Guide

**Status**: Migration Complete - Code Ready  
**Next Step**: Configure PostgreSQL Database  
**Estimated Time**: 15 minutes

## Overview

The codebase has been migrated from in-memory storage to PostgreSQL. All code changes are complete. You now need to:

1. Create a PostgreSQL database (Neon recommended)
2. Update the DATABASE_URL in your .env file
3. Push the schema to create tables
4. Test that everything works

---

## Step 1: Create PostgreSQL Database on Neon

### Why Neon?
- ✅ Serverless PostgreSQL (auto-scaling)
- ✅ Free tier: 0.5 GB storage, perfect for development
- ✅ Built-in connection pooling
- ✅ Easy setup (2 minutes)

### Setup Instructions

1. **Go to Neon**: https://neon.tech

2. **Sign up / Log in**:
   - Use GitHub, Google, or email

3. **Create New Project**:
   - Click "Create a project" button
   - **Project name**: `conference-chat-production`
   - **Region**: Choose closest to your users (e.g., US East, Europe West, Asia Southeast)
   - **PostgreSQL version**: 16 (latest)
   - Click "Create Project"

4. **Get Connection String**:
   - Once created, you'll see "Connection Details"
   - Select **"Pooled connection"** (IMPORTANT!)
   - Copy the connection string that looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

5. **Save It Securely**:
   - This connection string contains your database password
   - Don't commit it to git (it's in .gitignore)
   - Keep it safe for the next step

---

## Step 2: Update .env File

1. Open your `.env` file in the project root

2. Find this line:
   ```bash
   DATABASE_URL=postgresql://username:password@host.region.aws.neon.tech/neondb?sslmode=require
   ```

3. Replace it with YOUR connection string from Neon:
   ```bash
   DATABASE_URL=postgresql://your_actual_username:your_actual_password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Save the file

**Important**: Make sure you use the **pooled connection** string, not the direct connection string.

---

## Step 3: Push Schema to Database

Now we'll create the database tables using Drizzle.

1. **Run the migration command**:
   ```bash
   npm run db:push
   ```

2. **Expected Output**:
   ```
   ✓ Applying changes...
   ✓ Created table "users"
   ✓ Created table "clients"
   ✓ Created table "client_widgets"
   ✓ Schema pushed successfully
   ```

3. **If you see errors**:
   - **"DATABASE_URL not set"**: Check your .env file has the correct URL
   - **"Connection failed"**: Verify the connection string is correct and has ?sslmode=require
   - **"Authentication failed"**: Double-check username/password in the connection string

---

## Step 4: Verify Database

1. **Go to Neon Dashboard**: https://console.neon.tech

2. **Navigate to your project**

3. **Click "Tables" in the sidebar**

4. **You should see**:
   - ✅ `users` table (3 columns: id, username, password)
   - ✅ `clients` table (7 columns: id, user_id, name, public_api_key, allowed_domains, status, created_at)
   - ✅ `client_widgets` table (8 columns: id, client_id, primary_color, position, welcome_message, widget_name, created_at, updated_at)

5. **Click on each table** to inspect the schema

---

## Step 5: Start the Development Server

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Expected Output**:
   ```
   serving on port 5000
   ```

3. **No errors about DATABASE_URL** should appear

4. **Open your browser**: http://localhost:5000

---

## Step 6: Test Data Persistence

Now let's verify that data actually persists!

### Test 1: Create a User

1. **Go to**: http://localhost:5000/login

2. **Click "Register" or go to registration page**

3. **Create a test user**:
   - Username: `test_user_1`
   - Password: `TestPass123!`

4. **Click "Register"**

5. **You should be redirected to the dashboard**

### Test 2: Configure Widget

1. **Navigate to "Widget Configuration"**

2. **Change settings**:
   - Primary Color: `#ff5733` (orange)
   - Widget Name: `Test Support`
   - Welcome Message: `Hello! How can we help you?`
   - Position: `Bottom Left`

3. **Click "Save Configuration"**

4. **You should see**: "Configuration saved successfully"

### Test 3: Restart Server (THE BIG TEST!)

1. **Stop the server**: Press `Ctrl+C` in terminal

2. **Restart the server**:
   ```bash
   npm run dev
   ```

3. **Refresh browser**: http://localhost:5000

4. **Verify**:
   - ✅ You're still logged in (session persisted!)
   - ✅ Navigate to Widget Configuration
   - ✅ Your settings are still there! (Color: #ff5733, Name: Test Support, etc.)

5. **🎉 If everything is still there, DATA PERSISTENCE IS WORKING!**

### Test 4: Verify in Neon Dashboard

1. **Go to Neon Dashboard**: https://console.neon.tech

2. **Navigate to your project → SQL Editor**

3. **Run this query**:
   ```sql
   SELECT * FROM users;
   ```

4. **You should see**:
   - Your `test_user_1` user with hashed password

5. **Run this query**:
   ```sql
   SELECT * FROM clients;
   ```

6. **You should see**:
   - A client record with your API key (starting with `pk_live_`)
   - Allowed domains as empty array `[]`
   - Status: `active`

7. **Run this query**:
   ```sql
   SELECT * FROM client_widgets;
   ```

8. **You should see**:
   - Your widget configuration
   - primary_color: `#ff5733`
   - widget_name: `Test Support`
   - position: `bottom-left`

---

## Troubleshooting

### Error: "DATABASE_URL environment variable is not set"

**Cause**: The .env file is not being loaded or DATABASE_URL is not set

**Solution**:
1. Check `.env` file exists in project root
2. Verify DATABASE_URL line is present and has your connection string
3. Restart the server after changing .env

### Error: "Connection failed" or "ENOTFOUND"

**Cause**: Invalid connection string or network issue

**Solution**:
1. Verify connection string format:
   ```
   postgresql://username:password@host/database?sslmode=require
   ```
2. Make sure you copied the POOLED connection string, not direct
3. Check for extra spaces or line breaks in the URL

### Error: "password authentication failed"

**Cause**: Wrong password in connection string

**Solution**:
1. Go back to Neon dashboard
2. Click "Connection Details" → "Reset Password"
3. Generate new password
4. Update DATABASE_URL with new password

### Error: "relation does not exist"

**Cause**: Tables not created

**Solution**:
1. Run `npm run db:push` again
2. Check Neon dashboard to verify tables were created

### Sessions Not Persisting

**Symptom**: Logged out after server restart

**Solution**:
1. Check that session table was created (check Neon dashboard)
2. Verify DATABASE_URL is correct
3. Check server logs for session store errors

---

## What Changed?

### Before (In-Memory Storage):
- ❌ Data stored in JavaScript Map objects
- ❌ Everything deleted on server restart
- ❌ No scalability (single instance only)
- ❌ No ACID guarantees
- ❌ Sessions lost on restart

### After (PostgreSQL):
- ✅ Data persisted in PostgreSQL database
- ✅ Survives server restarts and deployments
- ✅ Can scale to multiple instances
- ✅ ACID transactions guaranteed
- ✅ Sessions persist across restarts
- ✅ Foreign key constraints enforced
- ✅ Production-ready

---

## Migration Checklist

- [x] Code migrated to use Drizzle ORM
- [x] Session store updated to use PostgreSQL
- [x] Environment variables configured
- [ ] Database created on Neon ← **YOU ARE HERE**
- [ ] DATABASE_URL set in .env
- [ ] Schema pushed to database
- [ ] Data persistence tested
- [ ] Sessions tested across restart

---

## Next Steps

Once database is working:

1. **Test all features**:
   - User registration/login
   - Widget configuration
   - Settings page (API key, domains)
   - All dashboard pages load

2. **Move to n8n Integration** (Blocker #2):
   - Set up n8n workflow for chat processing
   - This will make the widget chat actually work

3. **Set up Directus** (Blocker #3):
   - Configure knowledge base storage
   - Enable file uploads

---

## Alternative: Supabase

If you prefer Supabase over Neon:

1. **Go to**: https://supabase.com
2. **Create new project**
3. **Get connection string** from Settings → Database
4. **Select "Connection pooling" mode**
5. **Use URI format** (not session mode)
6. Follow same steps as Neon above

---

## Need Help?

If you run into issues:

1. Check the error message carefully
2. Verify DATABASE_URL format
3. Check Neon dashboard connection details
4. Make sure you're using pooled connection
5. Try regenerating password in Neon

**The code is ready. Once you set up the database, everything will work!**
