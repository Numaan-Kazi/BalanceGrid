import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getMonthlyTrackerData } from '../services/monthlyService';
import { getYearlyReport, exportTransactionsCsv } from '../services/reportService';

const router = Router();
router.use(authenticate);

// Monthly report
router.get('/monthly', async (req: Request, res: Response, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data = await getMonthlyTrackerData(req.user!.id, year, month);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Yearly report
router.get('/yearly', async (req: Request, res: Response, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const report = await getYearlyReport(req.user!.id, year);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

// CSV export
router.get('/export-csv', async (req: Request, res: Response, next) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;

    const csvContent = await exportTransactionsCsv(req.user!.id, year, month);

    const filename = year && month
      ? `balance_grid_transactions_${year}_${month}.csv`
      : 'balance_grid_all_transactions.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;

