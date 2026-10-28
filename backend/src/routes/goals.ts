import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createGoalSchema,
  updateGoalSchema,
  createAllocationSchema,
} from '../validators/schemas';
import {
  getSavingsGoalsWithProgress,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  createSavingsAllocation,
  deleteSavingsAllocation,
} from '../services/goalService';

const router = Router();
router.use(authenticate);

// Get all savings goals with calculated progress
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const goals = await getSavingsGoalsWithProgress(req.user!.id);
    res.json({ goals });
  } catch (error) {
    next(error);
  }
});

// Create savings goal
router.post('/', validateBody(createGoalSchema), async (req: Request, res: Response, next) => {
  try {
    const goal = await createSavingsGoal(req.user!.id, req.body);
    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
});

// Update savings goal
router.patch('/:id', validateBody(updateGoalSchema), async (req: Request, res: Response, next) => {
  try {
    const goal = await updateSavingsGoal(req.user!.id, req.params.id, req.body);
    res.json({ goal });
  } catch (error) {
    next(error);
  }
});

// Delete savings goal
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteSavingsGoal(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Create savings allocation from surplus
router.post('/allocate', validateBody(createAllocationSchema), async (req: Request, res: Response, next) => {
  try {
    const allocation = await createSavingsAllocation(req.user!.id, req.body);
    res.status(201).json({ allocation });
  } catch (error) {
    next(error);
  }
});

// Delete savings allocation
router.delete('/allocate/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteSavingsAllocation(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Allocation deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

