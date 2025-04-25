import express from 'express';
import { jwtCheck, jwtParse } from '../middleware/auth';
import OrderController from '../controllers/reOrderController';
import { validateReviewRequest } from '../middleware/validation';
import authentications from '../middleware/authentications';
import reOrderController from '../controllers/reOrderController';

const router = express.Router();

router.get("/fetch-Order", authentications, reOrderController.getMyOrder);

router.post("/checkout/create-checkout-session",
  authentications,
  reOrderController.createCheckoutSession
);

router.post("/checkout/webhook", authentications,reOrderController.stripeWebhookHandler);

router.post(
  '/cash-on-delivery',
  authentications,
  reOrderController.placeCashOnDeliveryOrder
);


// Update these routes
router.post(
  "/:restaurantId/reviews",
  authentications,
  validateReviewRequest,
  reOrderController.createReview
);

router.get(
  "/:restaurantId/reviews",
  authentications,
  reOrderController.getReviewsForRestaurant  // Remove any validation middleware here
);

router.get(
  "/:orderId/reviews",
  authentications,
  reOrderController.getReviewsForOrder  // Remove any validation middleware here
);

export default router;

