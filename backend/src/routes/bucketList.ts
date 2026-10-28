import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createBucketPlanSchema,
  updateBucketPlanSchema,
  linkExpenseToPlanSchema,
  createBucketExpenseSchema,
} from '../validators/schemas';
import {
  getBucketPlansWithStats,
  createBucketPlan,
  updateBucketPlan,
  deleteBucketPlan,
  linkExpenseToPlan,
  addExpenseToBucketPlan,
} from '../services/bucketListService';

const router = Router();
router.use(authenticate);

// Get all bucket plans with linked expense stats
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const plans = await getBucketPlansWithStats(req.user!.id);
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// Create bucket plan
router.post('/', validateBody(createBucketPlanSchema), async (req: Request, res: Response, next) => {
  try {
    const plan = await createBucketPlan(req.user!.id, req.body);
    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
});

// Add direct expense to bucket plan
router.post('/expense', validateBody(createBucketExpenseSchema), async (req: Request, res: Response, next) => {
  try {
    const expense = await addExpenseToBucketPlan(req.user!.id, req.body);
    res.status(201).json({ expense, message: 'Expense linked to bucket plan and recorded in account.' });
  } catch (error) {
    next(error);
  }
});

// Update bucket plan
router.patch('/:id', validateBody(updateBucketPlanSchema), async (req: Request, res: Response, next) => {
  try {
    const plan = await updateBucketPlan(req.user!.id, req.params.id, req.body);
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// Delete bucket plan
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteBucketPlan(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Bucket plan deleted. Linked expenses were unlinked safely.' });
  } catch (error) {
    next(error);
  }
});

// Link or unlink an expense to a bucket plan
router.post('/link-expense', validateBody(linkExpenseToPlanSchema), async (req: Request, res: Response, next) => {
  try {
    const expense = await linkExpenseToPlan(req.user!.id, req.body);
    res.json({ expense });
  } catch (error) {
    next(error);
  }
});

export default router;

