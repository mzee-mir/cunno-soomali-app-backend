import express from "express";
import  MenuItemController  from "../controllers/MenuItemController";
import authentications from "../middleware/authentications";
import upload from "../middleware/multer";
//import { isAdmin } from "../middleware/Admin";

const router = express.Router();

router.get("/:restaurantId/menu",MenuItemController.getRestaurantMenu );

router.post("/:restaurantId/menu", MenuItemController.createMenuItem );

router.put("/:restaurantId/menu/:menuItemId", MenuItemController.updateMenuItem);

router.put(
    '/:restaurantId/menuImage/:menuItemId', 
    authentications, 
    upload.single('Dish-image'), 
    MenuItemController.uploadMenuItemImage
);

router.delete("/menu/:menuItemId/soft-delete", authentications, MenuItemController.softDeleteMenuItem);
router.patch("/menu/:menuItemId/restore", authentications, MenuItemController.restoreMenuItem);
router.delete("/menu/:menuItemId/permanent", authentications, MenuItemController.hardDeleteMenuItem);


export default router;