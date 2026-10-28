import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db/prisma';

const app = createApp();

describe('New Features and Enhancements Verification', () => {
  const timestamp = Date.now();
  const testUserEmail = `feature_test_${timestamp}@example.com`;
  const testUsername = `testuser_${timestamp}`;
  let authToken = '';
  let userId = '';
  let accountId = '';
  let categoryId = '';
  let monthlyPeriodId = '';
  let savingsGoalId = '';

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('1. Authentication: Username & Password Registration and Login', () => {
    it('registers a new user with username and password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Feature Tester',
          username: testUsername,
          email: testUserEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(testUsername);
      expect(res.body.user.email).toBe(testUserEmail);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.token).toBeDefined();

      authToken = res.body.token;
      userId = res.body.user.id;
    });

    it('rejects duplicate username registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          username: testUsername,
          email: `other_${Date.now()}@example.com`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/username is already taken/i);
    });

    it('logs in successfully with username and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUsername,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUserEmail);
      expect(res.body.token).toBeDefined();
    });

    it('logs in successfully with email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUserEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe(testUsername);
    });

    it('rejects incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUsername,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('2. Categories: Validation, Duplicate Prevention, and Archival on Deletion', () => {
    it('creates a trimmed custom category and prevents duplicates', async () => {
      const res1 = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '  Pet Expenses  ', icon: 'tag' });

      expect(res1.status).toBe(201);
      expect(res1.body.category.name).toBe('Pet Expenses');
      categoryId = res1.body.category.id;

      // Duplicate attempt (case-insensitive)
      const res2 = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'pet expenses', icon: 'tag' });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toMatch(/already exists/i);
    });

    it('archives rather than hard-deletes category if used by financial history', async () => {
      // Get monthly period first
      const periodRes = await request(app)
        .get('/api/monthly?year=2026&month=10')
        .set('Authorization', `Bearer ${authToken}`);
      expect(periodRes.status).toBe(200);
      monthlyPeriodId = periodRes.body.period.id;

      // Create an account and an expense with this category
      const accRes = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Savings Bank', openingBalance: 10000 });
      accountId = accRes.body.account.id;

      const expRes = await request(app)
        .post('/api/expenses/detailed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          categoryId,
          monthlyPeriodId,
          amount: 500,
          date: '2026-10-10',
          description: 'Dog food',
        });
      expect(expRes.status).toBe(201);

      // Attempt to delete category
      const delRes = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.archived).toBe(true);

      // Verify category is now archived
      const catInDb = await prisma.category.findUnique({ where: { id: categoryId } });
      expect(catInDb?.isArchived).toBe(true);
    });
  });

  describe('3. Savings Goals: Allocation Limits, Overall Savings, and Reaching Target', () => {
    it('creates a savings goal with target 2000', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Emergency Fund', targetAmount: 2000 });

      expect(res.status).toBe(201);
      savingsGoalId = res.body.goal.id;
    });

    it('rejects allocation when user has zero overall savings', async () => {
      const res = await request(app)
        .post('/api/goals/allocate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          savingsGoalId,
          amount: 500,
          date: '2026-10-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/don't have any savings available/i);
    });

    it('allows valid allocation from overall savings and prevents exceeding remaining goal target of 500', async () => {
      // Add additional savings so overall savings is 5000
      await request(app)
        .post('/api/accounts/additional-savings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Fixed Deposit Reserve',
          amount: 5000,
          date: '2026-10-01',
        });

      // Allocate 1500 from overall savings (no accountId needed)
      const alloc1 = await request(app)
        .post('/api/goals/allocate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          savingsGoalId,
          amount: 1500,
          date: '2026-10-15',
        });
      expect(alloc1.status).toBe(201);

      // Try allocating 600 (remaining needed is 500)
      const allocOver = await request(app)
        .post('/api/goals/allocate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          savingsGoalId,
          amount: 600,
          date: '2026-10-16',
        });
      expect(allocOver.status).toBe(400);
      expect(allocOver.body.error).toMatch(/cannot exceed remaining goal target/i);

      // Allocate exactly 500
      const alloc2 = await request(app)
        .post('/api/goals/allocate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          savingsGoalId,
          amount: 500,
          date: '2026-10-16',
        });
      expect(alloc2.status).toBe(201);

      // Goal should now be completed
      const goalInDb = await prisma.savingsGoal.findUnique({ where: { id: savingsGoalId } });
      expect(goalInDb?.isCompleted).toBe(true);

      // Further allocation must be rejected
      const allocAfterComplete = await request(app)
        .post('/api/goals/allocate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          savingsGoalId,
          amount: 100,
          date: '2026-10-17',
        });
      expect(allocAfterComplete.status).toBe(400);
    });
  });

  describe('4. Recurring Bills: Monthly Balance Deduction, Balance Check, and Deletion Protection', () => {
    let billId = '';

    it('creates a recurring bill', async () => {
      const res = await request(app)
        .post('/api/recurring-bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Home Internet',
          amount: 1200,
          categoryId,
          frequency: 'MONTHLY',
          nextDueDate: '2026-10-25',
        });

      expect(res.status).toBe(201);
      billId = res.body.bill.id;
    });

    it('rejects bill payment when monthly available balance is insufficient', async () => {
      const payRes = await request(app)
        .post(`/api/recurring-bills/${billId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1200,
          paidDate: '2026-10-21',
        });

      expect(payRes.status).toBe(400);
      expect(payRes.body.error).toMatch(/Insufficient monthly balance/i);
    });

    it('pays bill successfully and advances nextDueDate after initializing monthly balance', async () => {
      // Set starting balance for the month
      await request(app)
        .put(`/api/monthly/starting-balance/${monthlyPeriodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startingBalance: 25000 });

      const payRes = await request(app)
        .post(`/api/recurring-bills/${billId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1200,
          paidDate: '2026-10-21',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.nextDueDate).toBe('2026-11-25');
    });

    it('prevents duplicate payment in the same cycle', async () => {
      const dupRes = await request(app)
        .post(`/api/recurring-bills/${billId}/pay`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1200,
          paidDate: '2026-10-21',
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.error).toMatch(/already been paid/i);
    });

    it('prevents deleting a bill that has paid records', async () => {
      const delRes = await request(app)
        .delete(`/api/recurring-bills/${billId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(400);
      expect(delRes.body.error).toMatch(/paid occurrences must be preserved/i);
    });
  });

  describe('5. Monthly Period Lifecycle: Starting Balance, Closing, and Read-Only Enforcement', () => {
    it('sets starting balance on the month', async () => {
      const res = await request(app)
        .put(`/api/monthly/starting-balance/${monthlyPeriodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ startingBalance: 25000 });

      expect(res.status).toBe(200);
      expect(res.body.period.startingBalance).toBe('25000');
    });

    it('closes the month and finalizes savings', async () => {
      const closeRes = await request(app)
        .post(`/api/monthly/close/${monthlyPeriodId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'October closed' });

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.period.isClosed).toBe(true);
      expect(closeRes.body.period.finalizedSavings).toBeDefined();
    });

    it('rejects adding new expenses to closed month', async () => {
      const res = await request(app)
        .post('/api/expenses/detailed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          categoryId,
          monthlyPeriodId,
          amount: 100,
          date: '2026-10-28',
          description: 'Late expense',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/closed/i);
    });
  });

  describe('6. Additional Savings and Overall Total Savings', () => {
    let addSavingsId = '';

    it('creates additional savings and calculates overall total savings', async () => {
      const createRes = await request(app)
        .post('/api/accounts/additional-savings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Diwali Bonus Deposit',
          amount: 15000,
          date: '2026-10-20',
        });

      expect(createRes.status).toBe(201);
      addSavingsId = createRes.body.item.id;

      const summaryRes = await request(app)
        .get('/api/accounts/savings-summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.netAdditionalSavings).toBeGreaterThanOrEqual(15000);
      expect(summaryRes.body.overallTotalSavings).toBeGreaterThan(0);
      expect(summaryRes.body.additionalSavings.length).toBeGreaterThan(0);
    });

    it('edits and deletes additional savings cleanly', async () => {
      const editRes = await request(app)
        .patch(`/api/accounts/additional-savings/${addSavingsId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 16000 });

      expect(editRes.status).toBe(200);

      const delRes = await request(app)
        .delete(`/api/accounts/additional-savings/${addSavingsId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
    });
  });
});
