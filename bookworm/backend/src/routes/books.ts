import { Router } from 'express';
import { getBooks, getBookById, getFeaturedBooks, getRecommended } from '../controllers/booksController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Order matters — specific routes before parameterised ones
router.get('/featured',     getFeaturedBooks);
router.get('/recommended',  optionalAuth, getRecommended);
router.get('/',             getBooks);
router.get('/:id',          getBookById);

export default router;
