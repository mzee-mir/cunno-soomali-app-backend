import User from "../models/user";
import { Request, Response } from "express";
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sendEmail from "../config/sendEmail";
import { PASSWORD_RESET_REQUEST_TEMPLATE, verifyEmailTemplate } from "../utils/verifyEmailTemplate";
import generatedAccessToken from "../utils/generateAccessToken";
import generatedRefreshToken from "../utils/generateRefreshToken"; 
import uploadImageCloudinary from "../utils/uploadImageCloudinary";
import generatedOtp from "../utils/generateOtp";
import generateResetToken from "../utils/generateResetToken";
import Restaurant from "../models/Restaurant";
import Order from "../models/Order";
import mongoose from "mongoose";
import NotificationController from './NotificationController';
import { sendNotificationToUser } from '../seervices/webSocketService';

interface JwtPayload {
    _id: string;
}

// Define cookie options
const CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Ensure cookies are only sent over HTTPS in production
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const signupUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                message: "Please provide email, name, password, and confirmPassword",
            });
        }


        const user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password, salt);

        const payload = {
            name,
            email,
            password: hashPassword
        };

        if(password !== confirmPassword){
            return res.status(400).json({
                message : "Password and confirmPassword must be same.",
                error : true,
                success : false,
            })
        }

        const newUser = new User(payload);
        const savedUser = await newUser.save();

        const otp = generatedOtp()
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        const update = await User.findByIdAndUpdate(newUser._id,{
            verify_email_otp : otp,
            verify_email_otp_expiry : new Date(otpExpires).toISOString()
        })

        await sendEmail(
            email,
            "Verify email from Cunno somali",
            verifyEmailTemplate({
                name,
                otp: otp
            })
        );

        return res.status(201).json({
            message: "User registered successfully",
            data: savedUser
        });

    } catch (error) {
        return res.status(500).json({
            message: "An error occurred during signup",
            error: true,
            success: false
        });
    }
};

const verifyEmailController = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        const currentTime = new Date().toISOString()

        if(!user.verify_email_otp_expiry || new Date(user.verify_email_otp_expiry).getTime() < new Date(currentTime).getTime()) {
            return res.status(400).json({
                message: "Otp is expired",
                error: true,
                success: false
            })
        }

        if(otp !== user.verify_email_otp){
            return res.status(400).json({
                message : "Invalid otp",
                error : true,
                success : false
            })
        }

        const updateUser = await User.findByIdAndUpdate(user?._id,{
            verify_email_otp : "",
            verify_email_otp_expiry : "",
            verify_email : true
        })
        await user.save();

        return res.json({
            message: "Email verified successfully",
            success: true,
            error: false
        });
    } catch (error) {
        return res.status(500).json({
            message: "An error occurred during email verification",
            error: true,
            success: false
        });
    }
};

const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please provide email and password",
                error: true,
                success: false
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User not registered",
                error: true,
                success: false
            });
        }

        if (user.status !== "Active") {
            return res.status(400).json({
                message: "Please contact the admin",
                error: true,
                success: false
            });
        }

        const checkPassword = await bcryptjs.compare(password, user.password);

        if (!checkPassword) {
            return res.status(400).json({
                message: "Incorrect password",
                error: true,
                success: false
            });
        }

        const accessToken = await generatedAccessToken(user._id.toString());
        const refreshToken = await generatedRefreshToken(user._id.toString());

        await User.findByIdAndUpdate(user._id.toString(), {
            last_login_date: new Date()
        });

        res.cookie("accessToken", accessToken, CookieOptions);
        res.cookie("refreshToken", refreshToken, CookieOptions);

        return res.json({
            message: "Login successful",
            error: false,
            success: true,
            data: {
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "An error occurred during login",
            error: true,
            success: false
        });
    }
};

const logoutUser = async (req: Request, res: Response) => {
    try {
        const userId = req.userId; // Ensure this is set by your middleware

        res.clearCookie("accessToken", CookieOptions);
        res.clearCookie("refreshToken", CookieOptions);

        const removeRefreshToken = await User.findByIdAndUpdate(userId,{
            refresh_token : ""
        })

        await User.findByIdAndUpdate(userId, {
            refresh_token: ""
        });

        return res.json({
            message: "Logout successful",
            error: false,
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: "An error occurred during logout",
            error: true,
            success: false
        });
    }
};

//upload user avatar
const uploadAvatar= async (req:Request,res:Response) => {
    try {
        const userId = req.userId // auth middlware
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
                error: true,
                success: false
            });
        }
        
        const upload = await uploadImageCloudinary(req.file)
        
        
        const updateUser = await User.findByIdAndUpdate(userId,{
            avatar : upload.url
        })

        return res.json({
            message : "upload profile",
            success : true,
            error : false,
            data : upload
        })

    } catch (error) {
        return res.status(500).json({
            message : "there is an error with the uploadAvatar",
            error : true,
            success : false
        })
    }
}


const updateUserDetails = async (req:Request,res:Response) => {
    try {
        const userId = req.userId //auth middleware
        const { name, email, mobile, password } = req.body 

        let hashPassword = ""

        if(password){
            const salt = await bcryptjs.genSalt(10)
            hashPassword = await bcryptjs.hash(password,salt)
        }

        const updateUser = await User.updateOne({ _id : userId},{
            ...(name && { name : name }),
            ...(email && { email : email }),
            ...(mobile && { mobile : mobile }),
            ...(password && { password : hashPassword })
        })

        return res.json({
            message : "Updated successfully",
            error : false,
            success : true,
            data : updateUser
        })


    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}

//forgot password not login
const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }

        const otp = generatedOtp();
        const resetToken = generateResetToken(); // Generate a secure reset token
        const expireTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await User.findByIdAndUpdate(user._id, {
            reset_token: resetToken,
            reset_token_expiry: expireTime,
            forgot_password_otp: otp,
            forgot_password_expiry: expireTime,
        });

        await sendEmail(
            email,
            "Password Reset Request",
            PASSWORD_RESET_REQUEST_TEMPLATE({ name: user.name, otp })
        );

        return res.json({
            message: "OTP sent to your email",
            resetToken, // Return the reset token to the client
        });
    } catch (error) {
        return res.status(500).json({ message: "Error in forgot password" });
    }
};

//verify forgot password otp
const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp, resetToken } = req.body;

        if (!email || !otp || !resetToken) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }

        const currentTime = new Date().toISOString();

        // Validate the reset token and OTP
        if (
            user.reset_token !== resetToken ||
            user.forgot_password_otp !== otp ||
            new Date(user.reset_token_expiry).getTime() < new Date(currentTime).getTime()
        ) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Clear the reset token and OTP after successful verification
        await User.findByIdAndUpdate(user._id, {
            reset_token: "",
            reset_token_expiry: "",
            forgot_password_otp: "",
            forgot_password_expiry: "",
        });

        return res.json({ message: "OTP verified successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Error verifying OTP" });
    }
};

//reset the password
const resetpassword = async (req: Request, res: Response) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        // Validation
        if (!email || !newPassword || !confirmPassword ) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }

        

        // Verify password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(newPassword, salt);

        // Update user
        await User.findByIdAndUpdate(user._id, {
            password: hashPassword,
            
        });

        return res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Password reset error:", error);
        return res.status(500).json({ message: "Error resetting password" });
    }
};

//refresh token controller
const refreshToken = async(req:Request,res:Response) => {
    try {
        const refreshToken = req.cookies.refreshToken || req?.headers?.authorization?.split(" ")[1]  /// [ Bearer token]

        if(!refreshToken){
            return res.status(401).json({
                message : "Invalid token",
                error  : true,
                success : false
            })
        }

        const verifyToken = await jwt.verify(refreshToken,process.env.SECRET_KEY_REFRESH_TOKEN || '') as JwtPayload

        if(!verifyToken){
            return res.status(401).json({
                message : "token is expired",
                error : true,
                success : false
            })
        }

        const userId = verifyToken._id

        const newAccessToken = await generatedAccessToken(userId)

        res.cookie('accessToken',newAccessToken,CookieOptions)

        return res.json({
            message : "New Access token generated",
            error : false,
            success : true,
            data : {
                accessToken : newAccessToken
            }
        })


    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}


//get login user details
const userDetails = async(req:Request, res:Response) => {
    try {
        const userId  = req.userId

        console.log(userId)

        const user = await User.findById(userId).select('-password -refresh_token')

        return res.json({
            message : 'user details',
            data : user,
            error : false,
            success : true
        })
    } catch (error) {
        return res.status(500).json({
            message : "Something is wrong",
            error : true,
            success : false
        })
    }
}


// Add restaurant to user
const addRestaurants = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const {
            name,
            description,
            address,
            estimatedDeliveryTime,
            deliveryPrice,
            city,
            imageUrl,
            country,
            phone,
            email,
            openingHours,
            cuisineType
        } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Process cuisineType - split string and trim each item
        const cuisineTypesArray = typeof cuisineType === 'string' 
            ? cuisineType.split(',').map((item: string) => item.trim())
            : Array.isArray(cuisineType) 
                ? cuisineType.map((item: string) => item.toString().trim())
                : [];

        // Create new restaurant
        const newRestaurant = new Restaurant({
            name,
            description,
            address,
            estimatedDeliveryTime,
            deliveryPrice,
            city,
            country,
            imageUrl,
            phone,
            email,
            openingHours,
            cuisineType: cuisineTypesArray,
            owner: userId
        });

        const savedRestaurant = await newRestaurant.save();

        // Update user's role if not already a restaurant owner
        if (user.role !== 'RESTAURANT OWNER') {
            user.role = 'RESTAURANT OWNER';
            await user.save();
        }

        // Add restaurant to user's ownedRestaurants array
        user.ownedRestaurants.push(savedRestaurant._id);
        await user.save();

        return res.status(201).json({
            message: "Restaurant added successfully",
            data: savedRestaurant,
            success: true,
            error: false
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error adding restaurant",
            error: true,
            success: false
        });
    }
};

// Get user's restaurants
const getRestaurants = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const user = await User.findById(userId).populate({
            path: "ownedRestaurants",
            populate: {
                path: "menuItems", // Populate menuItems inside ownedRestaurants
                select: "-__v" // Exclude __v from menuItems
            },
            select: "-__v" // Exclude __v from restaurants
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({
            message: "User restaurants retrieved successfully",
            data: user.ownedRestaurants,
            success: true,
            error: false
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error updating restaurant",
            error: true,
            success: false
        });
    }
};


// Update restaurant
const updateRestaurant = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const restaurantId = req.params.id;
        const updateData = req.body;

        // Check if restaurant exists and belongs to user
        const restaurant = await Restaurant.findOne({
            _id: restaurantId,
            owner: userId
        });

        if (!restaurant) {
            return res.status(404).json({ 
                message: "Restaurant not found or you don't have permission",
                error: true,
                success: false
            });
        }

        // Handle cuisineType if provided
        if (updateData.cuisineType) {
            updateData.cuisineType = typeof updateData.cuisineType === 'string' 
                ? updateData.cuisineType.split(',').map((item: string) => item.trim())
                : Array.isArray(updateData.cuisineType) 
                    ? updateData.cuisineType.map((item: string) => item.toString().trim())
                    : [];
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            updateData,
            { new: true }
        );

        return res.json({
            message: "Restaurant updated successfully",
            data: updatedRestaurant,
            success: true,
            error: false
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error updating restaurant",
            error: true,
            success: false
        });
    }
};

// Add this to your UserAuthController.ts
const uploadRestaurantImage = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const restaurantId = req.params.restaurantId;
        
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
                error: true,
                success: false
            });
        }

        const restaurant = await Restaurant.findOne({
            _id: restaurantId,
            owner: userId
        });

        if (!restaurant) {
            return res.status(403).json({
                message: "Restaurant not found or you don't have permission",
                error: true,
                success: false
            });
        }

        const upload = await uploadImageCloudinary(req.file);
        console.log("upload from UIM", updateRestaurant,)
        
        // Update the single imageUrl field instead of pushing to an array
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            { imageUrl: upload.url },
            { new: true }
        );

        return res.json({
            message: "Restaurant image uploaded successfully",
            success: true,
            error: false,
            data: {
                imageUrl: upload.url,
                restaurant: updatedRestaurant
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "There was an error uploading the restaurant image",
            error: true,
            success: false
        });
    }
};
// Delete restaurant
const deleteRestaurant = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const restaurantId = req.params.id;

        // Check if restaurant exists and belongs to user
        const restaurant = await Restaurant.findOne({
            _id: restaurantId,
            owner: userId
        });

        if (!restaurant) {
            return res.status(404).json({ 
                message: "Restaurant not found or you don't have permission",
                error: true,
                success: false
            });
        }

        // Delete the restaurant
        await Restaurant.findByIdAndDelete(restaurantId);

        // Remove from user's ownedRestaurants array
        await User.findByIdAndUpdate(userId, {
            $pull: { ownedRestaurants: restaurantId }
        });

        return res.json({
            message: "Restaurant deleted successfully",
            success: true,
            error: false
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error deleting restaurant",
            error: true,
            success: false
        });
    }
};

// Get a restaurant by ID (Public)
const getRestaurantID = async (req: Request, res: Response) => {
    try {
        const restaurantId = req.params.restaurantId;
        
        if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
            return res.status(400).json({ message: "Invalid restaurant ID format" });
        }

        const restaurant = await Restaurant.findById(restaurantId)
            .select("-__v -updatedAt -createdAt") // ✅ Correct format
            .populate("menuItems", "-__v -createdAt -updatedAt");

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" });
        }

        res.json(restaurant);
    } catch (error) {
        console.error("Error fetching restaurant:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Search for restaurants (Public)
const searchRestaurant = async (req: Request, res: Response) => {
    try {
        const city = req.params.city;
        const searchQuery = (req.query.searchQuery as string) || "";
        const selectedCuisines = (req.query.selectedCuisines as string) || "";
        const sortOption = (req.query.sortOption as string) || "lastUpdated";
        const page = parseInt(req.query.page as string) || 1;

        let query: any = { city: new RegExp(city, "i") };
        if (selectedCuisines) {
            const cuisinesArray = selectedCuisines.split(",").map((cuisine) => new RegExp(cuisine, "i"));
            query["cuisineType"] = { $all: cuisinesArray };
        }
        if (searchQuery) {
            const searchRegex = new RegExp(searchQuery, "i");
            query["$or"] = [{ name: searchRegex }, { cuisineType: { $in: [searchRegex] } }];
        }

        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        const restaurants = await Restaurant.find(query)
            .sort({ [sortOption]: 1 })
            .skip(skip)
            .limit(pageSize)
            .lean();

        const total = await Restaurant.countDocuments(query);
        res.json({
            data: restaurants,
            pagination: { total, page, pages: Math.ceil(total / pageSize) },
        });
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong" });
    }
};

// Get all orders for the logged-in restaurant owner
const getRestaurantOrders = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        // Find the user and their owned restaurants
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                error: true,
                success: false
            });
        }

        const ownedRestaurantIds = user.ownedRestaurants;

        if (ownedRestaurantIds.length === 0) {
            return res.json({
                message: "No restaurants found for this user",
                data: [],
                success: true,
                error: false
            });
        }

        // Find orders associated with the user's restaurants
        const orders = await Order.find({ restaurant: { $in: ownedRestaurantIds } })
            .populate("restaurant")
            .populate("user")
            .exec();

            

        return res.json({
            message: "Orders retrieved successfully",
            data: orders,
            success: true,
            error: false
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({
            message: "Error fetching orders",
            error: true,
            success: false
        });
    }
};

// Update the status of an order
const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Find the order and populate the restaurant
        const order = await Order.findById(orderId).populate("restaurant");
        if (!order) {
            return res.status(404).json({
                message: "Order not found",
                error: true,
                success: false
            });
        }

        // Check ownership
        const restaurant = order.restaurant as any;
        if (!restaurant || restaurant.owner.toString() !== req.userId) {
            return res.status(403).json({
                message: "Unauthorized: You do not own this restaurant",
                error: true,
                success: false
            });
        }

        // Add null check for order.user
        if (!order.user) {
            console.error("Order has no user associated");
            return res.status(400).json({
                message: "Order has no user associated",
                error: true,
                success: false
            });
        }

        // Update and save
        order.status = status;
        await order.save();

        // Create notification for user
        const userNotification = await NotificationController.createNotification(
            order.user.toString(),
            "Order Status Updated",
            `Your order #${order._id.toString().slice(-6)} is now ${status}`,
            "order",
            order._id,
            "Order"
        );

        // Send real-time notification to user
        await sendNotificationToUser(order.user.toString(), userNotification);
        
        // Create notification for restaurant owner
        const ownerNotification = await NotificationController.createNotification(
            restaurant.owner.toString(),
            "Order Updated",
            `Order #${order._id.toString().slice(-6)} status changed to ${status}`,
            "order",
            order._id,
            "Order"
        );
        
        // Send real-time notification to owner
        await sendNotificationToUser(restaurant.owner.toString(), ownerNotification);

        return res.json({
            message: "Order status updated successfully",
            data: order,
            success: true,
            error: false
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error updating order status",
            error: true,
            success: false
        });
    }
};


export default {
    signupUser,
    verifyEmailController,
    loginUser,
    logoutUser,
    uploadAvatar,
    updateUserDetails,
    forgotPassword,
    verifyForgotPasswordOtp,
    resetpassword,
    userDetails,
    refreshToken,
    addRestaurants,
    uploadRestaurantImage,
    getRestaurants,
    getRestaurantID,
    searchRestaurant,
    updateRestaurant,
    deleteRestaurant,
    getRestaurantOrders,
    updateOrderStatus
};

