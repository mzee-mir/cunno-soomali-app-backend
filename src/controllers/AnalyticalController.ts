import mongoose from "mongoose";
import Order from "../models/Order";
import { Request, Response } from "express";

interface JwtPayload {
    _id: string;
}

const getOverallStats = async (req: Request, res: Response) => {
    try {
        const stats = await Order.aggregate([
            { $group: { 
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" }
            }},
            { $project: { 
                _id: 0,
                totalOrders: 1,
                totalRevenue: 1 
            }}
        ]);

        return res.json({
            message: "Overall statistics retrieved",
            data: stats[0] || { totalOrders: 0, totalRevenue: 0 },
            success: true,
            error: false
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching overall statistics",
            error: true,
            success: false
        });
    }
};

const getDailyStats = async (req: Request, res: Response) => {
    try {
        const dailyStats = await Order.aggregate([
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalOrders: { $sum: 1 },
                dailyRevenue: { $sum: "$totalAmount" }
            }},
            { $sort: { "_id": 1 } },
            { $project: {
                _id: 0,
                date: "$_id",
                totalOrders: 1,
                dailyRevenue: 1
            }}
        ]);

        return res.json({
            message: "Daily statistics retrieved",
            data: dailyStats,
            success: true,
            error: false
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching daily statistics",
            error: true,
            success: false
        });
    }
};

const getStatsPerRestaurant = async (req: Request, res: Response) => {
    try {
        const restaurantStats = await Order.aggregate([
            { $group: {
                _id: "$restaurant",
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" }
            }},
            { $lookup: {
                from: "restaurants",
                localField: "_id",
                foreignField: "_id",
                as: "restaurantDetails"
            }},
            { $unwind: "$restaurantDetails" },
            { $project: {
                _id: 0,
                restaurantId: "$_id",
                restaurantName: "$restaurantDetails.name",
                totalOrders: 1,
                totalRevenue: 1
            }}
        ]);

        return res.json({
            message: "Restaurant statistics retrieved",
            data: restaurantStats,
            success: true,
            error: false
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching restaurant statistics",
            error: true,
            success: false
        });
    }
};

const getRestaurantDailyStats = async (req: Request, res: Response) => {
    try {
        const restaurantId = req.params.restaurantId;
        
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({
                message: "Invalid restaurant ID format",
                error: true,
                success: false
            });
        }

        const stats = await Order.aggregate([
            { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                totalOrders: { $sum: 1 },
                dailyRevenue: { $sum: "$totalAmount" }
            }},
            { $sort: { "_id": 1 } },
            { $project: {
                _id: 0,
                date: "$_id",
                totalOrders: 1,
                dailyRevenue: 1
            }}
        ]);

        return res.json({
            message: "Restaurant daily stats retrieved",
            data: stats,
            success: true,
            error: false
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching restaurant daily stats",
            error: true,
            success: false
        });
    }
};
  
  export default{
    getOverallStats,
    getDailyStats,
    getRestaurantDailyStats,
    getStatsPerRestaurant
  }