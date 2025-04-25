import { Router } from 'express'
import authentications from '../middleware/authentications'
import AnalyticalController from '../controllers/AnalyticalController';

const AnalyticalRouter = Router();

// Put the specific routes first
AnalyticalRouter.get("/overview", authentications, AnalyticalController.getOverallStats);
AnalyticalRouter.get("/per-restaurant", authentications, AnalyticalController.getStatsPerRestaurant);
AnalyticalRouter.get("/daily", authentications, AnalyticalController.getDailyStats);

// Put the dynamic route LAST
AnalyticalRouter.get("/:restaurantId/daily", authentications, AnalyticalController.getRestaurantDailyStats);


export default AnalyticalRouter;