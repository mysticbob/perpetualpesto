# Quick Start Guide - NoChickenLeftBehind

## 🚀 How to Run the Application

The application has been configured and is ready to run! Follow these steps:

### Step 1: Start the Backend Server
The backend is already running on port 3001. You can verify it's working:
```bash
curl http://localhost:3001/health
```

### Step 2: Start the Frontend
Due to a Vite console output issue, you may need to run it directly. Try one of these options:

**Option A: Direct Browser Access**
Since Vite might be running silently, try opening your browser to:
- http://localhost:3000 (configured port)
- http://localhost:5173 (default Vite port)

**Option B: Run Vite Directly**
```bash
# Kill any existing Vite processes
pkill -f vite

# Run Vite with explicit output
npx vite --port 3000 --host --open
```

**Option C: Use the dev command**
```bash
# This runs everything together
npm run dev
```

## ✅ What's Currently Working

### Backend (Port 3001)
- ✅ Server is running
- ✅ Database connected (PostgreSQL on port 5433)
- ✅ All API endpoints active
- ✅ 43 ingredients seeded with nutrition data

### Available Features
1. **Recipe Management** - Create, edit, view recipes
2. **Pantry Tracking** - Track items with expiration dates
3. **Meal Planning** - Plan weekly meals (AI needs API key)
4. **Shopping Lists** - Generate from meal plans
5. **Subscription Tiers** - Free, Small ($5), Family ($10)

## 🧪 Test the API

You can test the API directly:

```bash
# Health check
curl http://localhost:3001/health

# Test endpoint
curl http://localhost:3001/api/test

# Get ingredients (if you have a user)
curl http://localhost:3001/api/pantry/items \
  -H "x-user-id: test-user"
```

## 🔧 Troubleshooting

### If Frontend Won't Start:
1. Check if port 3000 is in use: `lsof -i :3000`
2. Kill the process: `kill <PID>`
3. Try port 5173 instead: `npx vite`

### If Backend Stops:
```bash
npm run dev:server
```

### Check Running Services:
```bash
# Check database
docker ps | grep recipe-planner

# Check server
curl http://localhost:3001/health

# Check frontend
ps aux | grep vite
```

## 📱 Using the Application

Once running, you should see:
1. **Login/Signup Page** - Create an account or login
2. **Dashboard** - Overview of pantry, expiring items, today's meals
3. **Pantry Manager** - Add/edit pantry items with expiration tracking
4. **Meal Planner** - Plan weekly meals with AI assistance
5. **Shopping List** - Generate lists from meal plans
6. **Billing** - View subscription tiers and upgrade

## 🎯 Features to Try

1. **Add Pantry Items**: Track what you have with expiration dates
2. **Plan Meals**: Use AI to suggest meals based on expiring items
3. **Generate Shopping Lists**: Create lists from meal plans
4. **Test Billing**: View pricing tiers (Stripe in test mode)

## 🔑 API Keys Needed (Optional)

To enable all features, add to `.env`:
```env
ANTHROPIC_API_KEY=your_key  # For AI meal planning
USDA_API_KEY=your_key       # For nutrition data
STRIPE_SECRET_KEY=sk_test_  # For payments
```

---

**Status**: Backend ✅ | Frontend ⚠️ (console output issue) | Database ✅