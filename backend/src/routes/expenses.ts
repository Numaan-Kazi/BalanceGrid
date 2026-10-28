import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createDetailedExpenseSchema,
  updateDetailedExpenseSchema,
  updateWeeklySummarySchema,
  setWeeklyZeroSpendSchema,
  switchExpenseModeSchema,
} from '../validators/schemas';
import {
  createDetailedExpense,
  updateDetailedExpense,
  deleteDetailedExpense,
  updateWeeklySummaryAmount,
  setWeeklyZeroSpend,
  switchExpenseMode,
  getCategoryWeekDetailedExpenses,
} from '../services/expenseService';

const router = Router();
router.use(authenticate);

// Create detailed expense
router.post('/detailed', validateBody(createDetailedExpenseSchema), async (req: Request, res: Response, next) => {
  try {
    const expense = await createDetailedExpense(req.user!.id, req.body);
    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
});

// Update detailed expense
router.patch('/detailed/:id', validateBody(updateDetailedExpenseSchema), async (req: Request, res: Response, next) => {
  try {
    const expense = await updateDetailedExpense(req.user!.id, req.params.id, req.body);
    res.json({ expense });
  } catch (error) {
    next(error);
  }
});

// Delete detailed expense
router.delete('/detailed/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteDetailedExpense(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get detailed expenses for a specific category and week
router.get('/detailed', async (req: Request, res: Response, next) => {
  try {
    const monthlyPeriodId = req.query.monthlyPeriodId as string;
    const categoryId = req.query.categoryId as string;
    const weekNumber = Number(req.query.weekNumber);

    if (!monthlyPeriodId || !categoryId || isNaN(weekNumber)) {
      return res.status(400).json({ error: 'monthlyPeriodId, categoryId, and weekNumber are required query parameters' });
    }

    const expenses = await getCategoryWeekDetailedExpenses(
      req.user!.id,
      monthlyPeriodId,
      categoryId,
      weekNumber
    );

    res.json({ expenses });
  } catch (error) {
    next(error);
  }
});

// Update weekly summary amount
router.post('/weekly-summary', validateBody(updateWeeklySummarySchema), async (req: Request, res: Response, next) => {
  try {
    const state = await updateWeeklySummaryAmount(req.user!.id, req.body);
    res.json({ state });
  } catch (error) {
    next(error);
  }
});

// Confirm zero spending for category-week
router.post('/weekly-zero', validateBody(setWeeklyZeroSpendSchema), async (req: Request, res: Response, next) => {
  try {
    const state = await setWeeklyZeroSpend(req.user!.id, req.body);
    res.json({ state });
  } catch (error) {
    next(error);
  }
});

// Switch mode between SUMMARY and DETAILED
router.post('/switch-mode', validateBody(switchExpenseModeSchema), async (req: Request, res: Response, next) => {
  try {
    const state = await switchExpenseMode(req.user!.id, req.body);
    res.json({ state });
  } catch (error) {
    next(error);
  }
});

export default router;

