import { Router } from "express";
import UserAuthController from "../controllers/UserAuthController";
import authentications from "../middleware/authentications";
import upload from "../middleware/multer";
import { param } from "express-validator";

const router = Router();

router.get("/orders", authentications, UserAuthController.getRestaurantOrders); // Add this

router.patch(
    "/order/:orderId/status",
    authentications,
    UserAuthController.updateOrderStatus
  );

router.post('/Add-restaurants', authentications, UserAuthController.addRestaurants);
router.get('/Get-restaurants', authentications, UserAuthController.getRestaurants);
router.put('/Updating-restaurants/:id', authentications, UserAuthController.updateRestaurant);
router.put(
    '/upload-restaurant-image/:restaurantId', 
    authentications, 
    upload.single('image'), 
    UserAuthController.uploadRestaurantImage
);
router.delete('/Deleting-restaurants/:id', authentications, UserAuthController.deleteRestaurant);

router.get(
    "/search/:city", 
    param("city")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("City paramenter must be a valid string"),
    UserAuthController.searchRestaurant); // Search restaurants by city

router.get(
    "/:restaurantId", 
    param("restaurantId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("RestaurantId paramenter must be a valid string"),
    UserAuthController.getRestaurantID); // Get a single restaurant
    


export default router;