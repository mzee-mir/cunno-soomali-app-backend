import express from "express";
import { param } from "express-validator";
import RestaurentController from "../controllers/RestaurentController";


const router = express.Router();

router.get(
  "/detail/:restaurantId",
  param("restaurantId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("RestaurantId paramenter must be a valid string"),
  RestaurentController.getRestaurant
);

router.get(
    "/search/:city",
    param("city")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("City paramenter must be a valid string"),
    RestaurentController.searchRestaurant
  );
  
  export default router;