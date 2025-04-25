import { Request, Response } from 'express';
import Order from '../models/Order';
import { subDays, subMonths, subWeeks } from 'date-fns';
import User from '../models/user';

interface DashboardData {
  totalRevenue: number;
  regularCustomers: number;
  growthRate: number;
  totalOrders: number;
  orderCompletionRate: number;
}

type TimePeriod = 'day' | 'week' | 'month';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { timePeriod = 'month' } = req.query as { timePeriod?: TimePeriod };
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    // Calculate date ranges
    switch (timePeriod) {
      case 'week':
        startDate = subWeeks(now, 1);
        previousStartDate = subWeeks(now, 2);
        break;
      case 'day':
        startDate = subDays(now, 1);
        previousStartDate = subDays(now, 2);
        break;
      default: // month
        startDate = subMonths(now, 1);
        previousStartDate = subMonths(now, 2);
    }

    // Get user's owned restaurants
    const userId = req.userId; // Make sure this is set by your authentication middleware
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const ownedRestaurantIds = user.ownedRestaurants;

    // Base match for current period
    const currentPeriodMatch = {
      createdAt: { $gte: startDate, $lte: now },
      restaurant: { $in: ownedRestaurantIds }
    };

    // Base match for previous period
    const previousPeriodMatch = {
      createdAt: { $gte: previousStartDate, $lte: startDate },
      restaurant: { $in: ownedRestaurantIds }
    };

    // Execute all queries in parallel for better performance
    const [
      totalRevenueResult,
      regularCustomersResult,
      currentPeriodOrders,
      previousPeriodOrders,
      completedOrders
    ] = await Promise.all([
      Order.aggregate([
        { $match: currentPeriodMatch },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: currentPeriodMatch },
        {
          $group: {
            _id: { user: '$user', restaurant: '$restaurant' },
            orderCount: { $sum: 1 },
          },
        },
        { $match: { orderCount: { $gt: 5 } } },
        { $count: 'regularCustomersCount' },
      ]),
      Order.countDocuments(currentPeriodMatch),
      Order.countDocuments(previousPeriodMatch),
      Order.countDocuments({
        ...currentPeriodMatch,
        status: { $in: ['delivered', 'completed', 'fulfilled'] },
      }),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const regularCustomers = regularCustomersResult[0]?.regularCustomersCount || 0;
    const growthRate = previousPeriodOrders === 0 
      ? 0 
      : ((currentPeriodOrders - previousPeriodOrders) / previousPeriodOrders) * 100;
    const orderCompletionRate = currentPeriodOrders === 0 
      ? 0 
      : (completedOrders / currentPeriodOrders) * 100;

    const dashboardData: DashboardData = {
      totalRevenue,
      regularCustomers,
      growthRate,
      totalOrders: currentPeriodOrders,
      orderCompletionRate,
    };

    return res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({ 
      message: 'Error fetching dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};