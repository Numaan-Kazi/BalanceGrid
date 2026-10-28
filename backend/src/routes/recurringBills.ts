import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createRecurringBillSchema,
  updateRecurringBillSchema,
  markBillPaidSchema,
} from '../validators/schemas';
import {
  getRecurringBills,
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  markRecurringBillPaid,
} from '../services/recurringBillService';

const router = Router();
router.use(authenticate);

// Get recurring bills
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const bills = await getRecurringBills(req.user!.id);
    res.json({ bills });
  } catch (error) {
    next(error);
  }
});

// Create recurring bill
router.post('/', validateBody(createRecurringBillSchema), async (req: Request, res: Response, next) => {
  try {
    const bill = await createRecurringBill(req.user!.id, req.body);
    res.status(201).json({ bill });
  } catch (error) {
    next(error);
  }
});

// Update recurring bill (allowed for unpaid bills)
router.patch('/:id', validateBody(updateRecurringBillSchema), async (req: Request, res: Response, next) => {
  try {
    const bill = await updateRecurringBill(req.user!.id, req.params.id, req.body);
    res.json({ bill, message: 'Recurring bill updated.' });
  } catch (error) {
    next(error);
  }
});

// Mark bill as paid (converts to actual detailed expense and advances nextDueDate)
router.post('/:id/pay', validateBody(markBillPaidSchema), async (req: Request, res: Response, next) => {
  try {
    const result = await markRecurringBillPaid(req.user!.id, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Bill marked as paid and expense recorded.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// Delete recurring bill (allowed for unpaid bills only)
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteRecurringBill(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Recurring bill deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;

