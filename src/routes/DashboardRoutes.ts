import express from 'express';
import { getDashboardData } from '../controllers/DashboardController';
import { query } from 'express-validator';
import authentications from '../middleware/authentications';

const router = express.Router();

router.get(
    '/', 
    authentications,
    query('timePeriod').optional().isIn(['day', 'week', 'month']),
    getDashboardData
);

export default router;