import { Request, Response } from "express";
import mongoose from "mongoose";
import cartMenuItem from "../models/cartMenuItem";
import Order from "../models/Order";
import Restaurant from '../models/Restaurant';
import User from "../models/user";
import MenuItems, { IMenuItem } from "../models/MenuItems";
import Review from "../models/review&rating";
import Stripe from "stripe";
import NotificationController from './NotificationController';
import { sendNotificationToUser } from '../seervices/webSocketService';

const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
const FRONTEND_URL = process.env.FRONTEND_URL as string;

interface CartItem {
  menuItemId: string;
  quantity: string;
  name: string;
}

interface DeliveryDetails {
  email:string;
  name:string;
  mobile:string;
  address:string;
}

interface CheckoutSessionRequest {
  cartItems: CartItem[];
  deliveryDetails: DeliveryDetails;
  restaurantId: string;
}

const getMyOrder = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .populate("restaurant")
      .populate("user");

      console.log("totalAmount", orders);

    res.json(orders);
  } catch (error: any) {
    console.log(error);
    return res.status(500).send({ message: "Something went wrong" });
  }
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { cartItems, deliveryDetails, restaurantId } = req.body as CheckoutSessionRequest;

    const restaurant = await Restaurant.findById(restaurantId).populate<{ menuItems: IMenuItem[] }>('menuItems');
    if (!restaurant) throw new Error("Restaurant not found");

    // Calculate total amount
    const itemsTotal = cartItems.reduce((total, cartItem) => {
      const menuItem = restaurant.menuItems.find(item => item._id.toString() === cartItem.menuItemId);
      if (!menuItem) throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
      return total + (menuItem.price * parseInt(cartItem.quantity));
    }, 0);

    const totalAmount = itemsTotal + restaurant.deliveryPrice;

    const newOrder = new Order({
      restaurant: restaurantId,
      user: req.userId,
      status: "placed",
      deliveryDetails,
      cartItems,
      totalAmount, // Add the calculated total amount
      createdAt: new Date(),
    });

    const lineItems = createLineItems(cartItems, restaurant.menuItems);
    const session = await createSession(
      lineItems,
      newOrder._id.toString(),
      restaurant.deliveryPrice,
      restaurantId
    );

    await newOrder.save();

     // Create notification
     const notification = await NotificationController.createNotification(
      req.userId,
      "Order Placed",
      `Your order #${newOrder._id.toString().slice(-6)} has been placed`,
      "order",
      newOrder._id,
      "Order"
    );

    // Send real-time notification
    await sendNotificationToUser(req.userId, notification);

    res.json({ url: session.url });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: error.message || "Failed to create checkout session" });
  }
};

const createLineItems = (
  cartItems: CartItem[],
  menuItemsFromDb: IMenuItem[]
): Stripe.Checkout.SessionCreateParams.LineItem[] => {
  return cartItems.map((cartItem) => {
    const menuItem = menuItemsFromDb.find(
      (item) => item._id.toString() === cartItem.menuItemId
    );

    if (!menuItem) throw new Error(`Menu item not found: ${cartItem.menuItemId}`);

    return {
      price_data: {
        currency: "usd",
        unit_amount: menuItem.price * 100, // Convert to cents
        product_data: {
          name: menuItem.name,
        },
      },
      quantity: parseInt(cartItem.quantity),
    };
  });
};

const createSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  orderId: string,
  deliveryPrice: number,
  restaurantId: string
) => {
  return await STRIPE.checkout.sessions.create({
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Delivery",
          type: "fixed_amount",
          fixed_amount: {
            amount: deliveryPrice * 100, // Convert to cents
            currency: "usd",
          },
        },
      },
    ],
    mode: "payment",
    metadata: { orderId, restaurantId },
    success_url: `${FRONTEND_URL}/order-status?success=true`,
    cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
  });
};

const stripeWebhookHandler = async (req: Request, res: Response) => {
  let event: Stripe.Event;

  try {
    const sig = req.headers["stripe-signature"] as string;
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Validate required fields
    if (!session.metadata?.orderId || session.amount_total === null) {
      return res.status(400).json({ 
        message: "Missing required session data",
        details: {
          hasOrderId: !!session.metadata?.orderId,
          hasAmountTotal: session.amount_total !== null
        }
      });
    }

    try {
      const order = await Order.findById(session.metadata.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Now we're sure amount_total is not null
      order.totalAmount = session.amount_total / 100; // Convert back to dollars
      order.status = "paid";
      await order.save();

      // Add null check for order.user
      if (!order.user) {
        console.error("Order has no user associated");
        return res.status(200).send(); // Still return success but skip notification
      }

      // Create notification
      const notification = await NotificationController.createNotification(
        order.user.toString(),
        "Payment Received",
        `Your order #${order._id.toString().slice(-6)} has been paid`,
        "order",
        order._id,
        "Order"
      );
      
      // Send real-time notification
      await sendNotificationToUser(order.user.toString(), notification);

    } catch (error) {
      console.error("Error updating order:", error);
      return res.status(500).json({ message: "Failed to update order" });
    }
  }

  res.status(200).send();
};

const placeCashOnDeliveryOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { cartItems, deliveryDetails, restaurantId } = req.body as {
      cartItems: CartItem[];
      deliveryDetails: DeliveryDetails;
      restaurantId: string;
    };

    const restaurant = await Restaurant.findById(restaurantId).populate<{ menuItems: IMenuItem[] }>('menuItems');
    if (!restaurant) throw new Error("Restaurant not found");

    // Calculate total amount
    const itemsTotal = cartItems.reduce((total, cartItem) => {
      const menuItem = restaurant.menuItems.find(item => item._id.toString() === cartItem.menuItemId);
      if (!menuItem) throw new Error(`Menu item not found: ${cartItem.menuItemId}`);
      return total + (menuItem.price * parseInt(cartItem.quantity));
    }, 0);

    const totalAmount = itemsTotal + restaurant.deliveryPrice;

    const newOrder = new Order({
      restaurant: restaurantId,
      user: userId,
      status: "cash_on_delivery",
      deliveryDetails,
      cartItems,
      totalAmount, // Add the calculated total amount
      payment_status: "CASH ON DELIVERY",
      createdAt: new Date(),
    });

    await newOrder.save();
    await cartMenuItem.deleteMany({ userId });

    res.status(201).json({ message: "Order placed", data: newOrder });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to place COD order" });
  }
};

const createReview = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const { rating, comment } = req.body as { rating: number; comment: string };

    const review = new Review({
      user: req.userId,
      restaurant: restaurantId,
      rating,
      comment,
    });

    await review.save();
    res.status(201).json(review);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error creating review" });
  }
};

const getReviewsForRestaurant = async (req: Request, res: Response) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ message: "Restaurant ID is required" });

    const reviews = await Review.find({ restaurant: restaurantId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ reviews });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error fetching reviews" });
  }
};

const getReviewsForOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ message: "Order ID is required" });

    const reviews = await Review.find({ order: orderId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ reviews });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error fetching reviews" });
  }
};

export default {
  getMyOrder,
  createCheckoutSession,
  stripeWebhookHandler,
  placeCashOnDeliveryOrder,
  createReview,
  getReviewsForRestaurant,
  getReviewsForOrder
};