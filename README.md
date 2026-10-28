# BalanceGrid — Production Personal Finance Tracker

BalanceGrid is a production-quality, minimal, secure personal finance tracker built with React, TypeScript, Node.js, Express, Prisma ORM, and PostgreSQL. It is designed around **weekly expense tracking**, **strict multi-user data isolation**, and **mathematical correctness** across all balances, surplus calculations, and goal progress.

---

## 1. Core Architecture & Tech Stack

- **Frontend**:
  - React 18 with TypeScript (strict mode)
  - Vite for high-speed builds and developer experience
  - Tailwind CSS with a clean white-and-sky-blue design system (`#0284C7`)
  - Lucide React iconography
  - React Hook Form + Zod for runtime schema validation
  - TanStack Query (React Query) for server-state caching and synchronization
  - React Router v6 for navigation
- **Backend**:
  - Node.js + Express with TypeScript
  - Zod for API input validation and parameter sanitization
  - Prisma ORM for type-safe database queries and migrations
  - Decimal.js for precise financial arithmetic (avoiding floating-point errors)
  - HTTP-only SameSite cookies and server-managed sessions for secure Google OAuth
- **Database**:
  - PostgreSQL 16+
  - Normalized relational schema with strict foreign keys, unique constraints, and indexes
  - Enforced `UNIQUE(user_id, year, month)` preventing duplicate monthly periods

---

## 2. Key Product Features & Domain Rules

### Weekly Expense Tracking (Monday – Sunday)
- Weeks run strictly from **Monday through Sunday**, with partial weeks at month boundaries.
- For example, in **October 2026**:
  - **Week 1**: October 1–4 (Thursday to Sunday)
  - **Week 2**: October 5–11 (Monday to Sunday)
  - **Week 3**: October 12–18 (Monday to Sunday)
  - **Week 4**: October 19–25 (Monday to Sunday)
  - **Week 5**: October 26–31 (Monday to Saturday)
- Each expense belongs to its actual calendar date and is assigned to exactly one monthly period.

### Independent Category-Week Tracking Modes
Every category within every week independently supports two modes:
1. **Summary Mode**: Enter one consolidated weekly spending total (e.g. Groceries = ₹2,500).
2. **Detailed Mode**: Enter individual itemized expenses with amount, date, description, and refund tracking. The weekly total is the sum of net detailed items.

### Double-Counting Prevention on Mode Conversion
- **Detailed → Summary**: Consolidates detailed records into a single summary amount inside a database transaction, removing detailed records so the same spending is never counted twice.
- **Summary → Detailed**: Creates an initial detailed expense entry matching the summary amount and resets summary spending to zero.

### Weekly Completion States
- **Unreported**: The user has not yet entered data for this category-week.
- **Confirmed Zero Spending**: The user explicitly confirmed ₹0 spending (`ZERO_SPENT`).
- **Recorded**: Spending has been entered in Summary or Detailed mode.

### Exact Account Balance Formula
Each account's live balance is calculated from:
```
Opening balance
+ Incoming income
+ Incoming transfers
+ Positive balance adjustments
− Expenses (net of refunds)
− Outgoing transfers
− Negative balance adjustments
− Outgoing savings movements (when money is physically transferred)
```
*Note: Merely earmarking surplus for a goal does NOT deduct from an account balance; only an actual physical transfer updates bank accounts.*

### Monthly Financial Formulas
- `Monthly Surplus = Actual Income Received − Net Expenses`
- `Net Expenses = Expenses − Linked Refunds`
- `Unallocated Surplus = Monthly Surplus − Net Savings Allocations`
- `Remaining Plan Budget = Plan Budget − Linked Actual Plan Expenses`
- `Goal Savings Needed = Target Amount − Total Allocated`

---

## 3. Getting Started & Local Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+ installed and running locally

### Step 1: Create Local PostgreSQL Database
Ensure your local PostgreSQL server is running. Create a database for the application (e.g. using `psql` or pgAdmin):
```sql
CREATE DATABASE balance_grid_db;
```

---

### Step 2: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from template:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*
4. Configure `.env` with your local PostgreSQL credentials and configuration:
   ```env
   DATABASE_URL="postgresql://your_db_user:your_db_password@localhost:5432/balance_grid_db?schema=public"
   PORT=5000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"
   SESSION_SECRET=your_secure_session_secret
   FRONTEND_URL="http://localhost:5173"
   ```
5. Run Prisma migrations against your local PostgreSQL database:
   ```bash
   npx prisma migrate dev --name init
   ```
6. Start backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

---

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` from template:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*
4. Configure `.env`:
   ```env
   VITE_API_URL="http://localhost:5000"
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```
5. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## 4. Google OAuth 2.0 Credentials Setup

To enable real Google Sign-In:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `BalanceGrid-App`).
3. Navigate to **APIs & Services** → **OAuth consent screen**:
   - Choose **External**.
   - Fill in App Name ("BalanceGrid") and Developer Contact Email.
   - Add scopes: `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
4. Navigate to **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `http://localhost:5000`
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/auth/google/callback`
     - `http://localhost:5173`
5. Copy your **Client ID** and **Client Secret**:
   - Place them in `backend/.env` under `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - Place the Client ID in `frontend/.env` under `VITE_GOOGLE_CLIENT_ID`.
6. Restart backend and frontend servers.

---

## 5. Running Automated Tests

Run domain calculation tests and Monday–Sunday week boundary tests:
```bash
# Run backend tests
cd backend
npm test
```

Tests verify:
- Monday–Sunday week boundary generation for partial months, leap years, and year-ends
- Financial formulas: net expenses, refunds, surplus, unallocated surplus, and balance calculations
- Multi-user authentication isolation: cross-user record protection and unauthorized request rejection
- Multi-record conversion safety and duplicate prevention

---

## 6. Production Build & Deployment

To generate optimized production builds:

```bash
# Build backend TypeScript
cd backend
npm run build

# Build frontend static bundle
cd ../frontend
npm run build
```

Production run command for backend:
```bash
cd backend
npm start
```

