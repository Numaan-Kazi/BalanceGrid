import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validators/schemas';
import { prisma } from '../db/prisma';

const router = Router();
router.use(authenticate);

// Get user categories
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const categories = await prisma.category.findMany({
      where: {
        userId: req.user!.id,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// Create custom category with duplicate prevention & trimmed name
router.post('/', validateBody(createCategorySchema), async (req: Request, res: Response, next) => {
  try {
    const trimmedName = req.body.name.trim();

    // Check for duplicate category name (case-insensitive) for this user
    const existing = await prisma.category.findFirst({
      where: {
        userId: req.user!.id,
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existing) {
      if (existing.isArchived) {
        // If it was archived, unarchive and return it
        const unarchived = await prisma.category.update({
          where: { id: existing.id },
          data: { isArchived: false, icon: req.body.icon || existing.icon },
        });
        return res.status(200).json({
          category: unarchived,
          message: `Category "${trimmedName}" was previously archived and has been restored.`,
        });
      }
      return res.status(400).json({
        error: `Category "${trimmedName}" already exists.`,
      });
    }

    const category = await prisma.category.create({
      data: {
        userId: req.user!.id,
        name: trimmedName,
        icon: req.body.icon || 'tag',
        isDefault: false,
        isArchived: false,
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

// Update category (rename, icon, unarchive)
router.patch('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response, next) => {
  try {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (req.body.name) {
      const trimmed = req.body.name.trim();
      const existing = await prisma.category.findFirst({
        where: {
          userId: req.user!.id,
          id: { not: category.id },
          name: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (existing) {
        return res.status(400).json({ error: `Category "${trimmed}" already exists.` });
      }
    }

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: {
        name: req.body.name ? req.body.name.trim() : category.name,
        icon: req.body.icon ?? category.icon,
        isArchived: req.body.isArchived !== undefined ? req.body.isArchived : category.isArchived,
      },
    });

    res.json({ category: updated });
  } catch (error) {
    next(error);
  }
});

// Delete or archive category
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const category = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check financial history usage:
    const [expenseCount, budgetCount, billCount] = await Promise.all([
      prisma.expense.count({ where: { categoryId: category.id, userId: req.user!.id } }),
      prisma.categoryBudget.count({ where: { categoryId: category.id, userId: req.user!.id } }),
      prisma.recurringBill.count({ where: { categoryId: category.id, userId: req.user!.id } }),
    ]);

    const totalUsage = expenseCount + budgetCount + billCount;

    if (totalUsage > 0) {
      // Prevent hard deletion to protect financial history integrity; use archival
      await prisma.category.update({
        where: { id: category.id },
        data: { isArchived: true },
      });

      return res.json({
        success: true,
        archived: true,
        message: `Category "${category.name}" has ${expenseCount} expenses and ${billCount} bills in financial history. It has been safely archived to preserve historical data.`,
      });
    }

    // Safe to delete completely if no financial history exists
    await prisma.weeklyCategoryState.deleteMany({
      where: { categoryId: category.id, userId: req.user!.id },
    });

    await prisma.category.delete({
      where: { id: category.id },
    });

    res.json({
      success: true,
      archived: false,
      message: `Category "${category.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

