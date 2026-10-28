import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createAccountSchema,
  updateAccountSchema,
  createAdjustmentSchema,
  createAdditionalSavingsSchema,
  updateAdditionalSavingsSchema,
} from '../validators/schemas';
import {
  getAccountBalances,
  createAccount,
  updateAccount,
  createBalanceAdjustment,
  getSavingsSummary,
  createAdditionalSavings,
  updateAdditionalSavings,
  deleteAdditionalSavings,
} from '../services/accountService';

const router = Router();
router.use(authenticate);

// Get all accounts with calculated balances
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const accounts = await getAccountBalances(req.user!.id);
    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

// Get overall savings summary & additional savings list
router.get('/savings-summary', async (req: Request, res: Response, next) => {
  try {
    const summary = await getSavingsSummary(req.user!.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// Create additional savings
router.post('/additional-savings', validateBody(createAdditionalSavingsSchema), async (req: Request, res: Response, next) => {
  try {
    const item = await createAdditionalSavings(req.user!.id, req.body);
    res.status(201).json({ item, message: 'Additional savings recorded successfully.' });
  } catch (error) {
    next(error);
  }
});

// Update additional savings
router.patch('/additional-savings/:id', validateBody(updateAdditionalSavingsSchema), async (req: Request, res: Response, next) => {
  try {
    const item = await updateAdditionalSavings(req.user!.id, req.params.id, req.body);
    res.json({ item, message: 'Additional savings updated successfully.' });
  } catch (error) {
    next(error);
  }
});

// Delete additional savings
router.delete('/additional-savings/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteAdditionalSavings(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Additional savings deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// Create new account
router.post('/', validateBody(createAccountSchema), async (req: Request, res: Response, next) => {
  try {
    const account = await createAccount(req.user!.id, req.body);
    res.status(201).json({ account });
  } catch (error) {
    next(error);
  }
});

// Update account
router.patch('/:id', validateBody(updateAccountSchema), async (req: Request, res: Response, next) => {
  try {
    const account = await updateAccount(req.user!.id, req.params.id, req.body);
    res.json({ account });
  } catch (error) {
    next(error);
  }
});

// Create balance adjustment
router.post('/adjustment', validateBody(createAdjustmentSchema), async (req: Request, res: Response, next) => {
  try {
    const adjustment = await createBalanceAdjustment(req.user!.id, req.body);
    res.status(201).json({ adjustment });
  } catch (error) {
    next(error);
  }
});

export default router;

