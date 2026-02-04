# 🚀 Database Setup - Run These Files In Order

Go to: **https://supabase.com/dashboard/project/drjllfprvymqoxappogt/sql**

Click "New Query" for each file and paste + run:

---

## ✅ Step 1: Create All Tables & Functions
**File:** `supabase/ALL_NEW_FEATURES.sql`

**What it does:**
- Creates 25+ tables
- Creates wallet functions (credit/debit)
- Creates booster activation
- Creates purchase verification
- Creates trending score calculator
- Creates notification system

**Time:** ~15 seconds

---

## ✅ Step 2: Add Security Policies
**File:** `supabase/SECURITY_POLICIES.sql`

**What it does:**
- Enables Row Level Security on all tables
- Users can only see their own data
- Prevents unauthorized access
- Moderators get special permissions

**Time:** ~10 seconds

---

## ✅ Step 3: Create Storage Bucket
**File:** `supabase/STORAGE_SETUP.sql`

**What it does:**
- Creates `user-content` bucket
- Sets 500MB file limit
- Allows images and videos
- Users can only upload to their own folder

**Time:** ~5 seconds

---

## ✅ Step 4: Schedule Cron Jobs
**File:** `supabase/CRON_JOBS.sql`

**What it does:**
- Updates trending scores every 5 min
- Cleans expired boosters hourly
- Updates hashtag trends every 10 min
- Cleans old analytics daily

**Time:** ~5 seconds

---

## 🎯 After Running All 4 Files:

Your database is **100% complete** with:
- ✅ All tables created
- ✅ All functions working
- ✅ Security enabled
- ✅ Storage configured
- ✅ Auto-updates scheduled

---

## 🧪 Test It:

Open your app: **http://localhost:5173**

Try these pages:
- `/discover` - Search should work
- `/inbox` - Notifications appear
- `/purchase-coins` - Packages load
- `/profile` - Tabs work
- `/settings` - All pages accessible

---

## ⚡ Quick Copy-Paste Order:

1. `ALL_NEW_FEATURES.sql` ← Run first
2. `SECURITY_POLICIES.sql` ← Run second
3. `STORAGE_SETUP.sql` ← Run third
4. `CRON_JOBS.sql` ← Run fourth

**Total time: ~45 seconds** ⏱️

---

## 🆘 If Something Goes Wrong:

**Error: "relation already exists"**
→ That's OK! It means table was already created. Continue.

**Error: "permission denied"**
→ Make sure you're logged in to Supabase dashboard.

**Error: "function does not exist"**
→ Run `ALL_NEW_FEATURES.sql` first, then try again.

---

## ✨ You're Done!

Your backend is now fully configured and ready! 🎉
