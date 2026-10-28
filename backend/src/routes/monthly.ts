import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  getOrCreateMonthlyPeriodSchema,
  updateMonthlyPeriodBudgetSchema,
  setCategoryBudgetSchema,
  setStartingBalanceSchema,
  closeMonthSchema,
} from '../validators/schemas';
import {
  getMonthlyTrackerData,
  updateMonthlyBudgetAndNotes,
  setCategoryBudget,
  setMonthlyStartingBalance,
  closeMonthlyPeriod,
  unlockMonthlyPeriod,
} from '../services/monthlyService';

const router = Router();
router.use(authenticate);

// Get monthly tracker details (matrix, summary, weeks)
router.get('/', validateQuery(getOrCreateMonthlyPeriodSchema), async (req: Request, res: Response, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    const data = await getMonthlyTrackerData(req.user!.id, year, month);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Set starting balance for month
router.put('/starting-balance/:periodId', validateBody(setStartingBalanceSchema), async (req: Request, res: Response, next) => {
  try {
    const updated = await setMonthlyStartingBalance(
      req.user!.id,
      req.params.periodId,
      req.body.startingBalance
    );
    res.json({ period: updated });
  } catch (error) {
    next(error);
  }
});

// Close / finalize monthly period
router.post('/close/:periodId', validateBody(closeMonthSchema), async (req: Request, res: Response, next) => {
  try {
    const updated = await closeMonthlyPeriod(
      req.user!.id,
      req.params.periodId,
      req.body.notes
    );
    res.json({ period: updated, message: 'Month finalized and closed successfully.' });
  } catch (error) {
    next(error);
  }
});

// Unlock monthly period
router.post('/unlock/:periodId', async (req: Request, res: Response, next) => {
  try {
    const updated = await unlockMonthlyPeriod(
      req.user!.id,
      req.params.periodId
    );
    res.json({ period: updated, message: 'Month unlocked successfully.' });
  } catch (error) {
    next(error);
  }
});

// Update overall monthly budget and notes
router.patch('/budget/:periodId', validateBody(updateMonthlyPeriodBudgetSchema), async (req: Request, res: Response, next) => {
  try {
    const updated = await updateMonthlyBudgetAndNotes(req.user!.id, req.params.periodId, req.body);
    res.json({ period: updated });
  } catch (error) {
    next(error);
  }
});

// Set category budget for month
router.post('/category-budget', validateBody(setCategoryBudgetSchema), async (req: Request, res: Response, next) => {
  try {
    const budget = await setCategoryBudget(req.user!.id, req.body);
    res.json({ categoryBudget: budget });
  } catch (error) {
    next(error);
  }
});

export default router;
