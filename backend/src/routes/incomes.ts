import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createIncomeSchema, updateIncomeSchema } from '../validators/schemas';
import {
  getIncomesForPeriod,
  createIncome,
  updateIncome,
  deleteIncome,
} from '../services/incomeService';

const router = Router();
router.use(authenticate);

// Get incomes for a specific month
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const incomes = await getIncomesForPeriod(req.user!.id, year, month);
    res.json({ incomes });
  } catch (error) {
    next(error);
  }
});

// Create income
router.post('/', validateBody(createIncomeSchema), async (req: Request, res: Response, next) => {
  try {
    const income = await createIncome(req.user!.id, req.body);
    res.status(201).json({ income });
  } catch (error) {
    next(error);
  }
});

// Update income
router.patch('/:id', validateBody(updateIncomeSchema), async (req: Request, res: Response, next) => {
  try {
    const income = await updateIncome(req.user!.id, req.params.id, req.body);
    res.json({ income });
  } catch (error) {
    next(error);
  }
});

// Delete income
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteIncome(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Income deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

