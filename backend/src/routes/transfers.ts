import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createTransferSchema } from '../validators/schemas';
import { getTransfers, createTransfer, deleteTransfer } from '../services/transferService';

const router = Router();
router.use(authenticate);

// Get transfers
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const transfers = await getTransfers(req.user!.id);
    res.json({ transfers });
  } catch (error) {
    next(error);
  }
});

// Create transfer
router.post('/', validateBody(createTransferSchema), async (req: Request, res: Response, next) => {
  try {
    const transfer = await createTransfer(req.user!.id, req.body);
    res.status(201).json({ transfer });
  } catch (error) {
    next(error);
  }
});

// Delete transfer
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    await deleteTransfer(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Transfer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

