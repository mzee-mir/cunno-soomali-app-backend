import express from "express";
import multer from "multer";
import MyRestaurantController from "../controllers/MyRestaurantController";
import { jwtCheck, jwtParse } from "../middleware/auth";
import { validateMyRestaurantRequest } from "../middleware/validation";




const router = express.Router();

// multer middleware

const storage = multer.memoryStorage();
const Upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 ,
    },
})


router.get("/", jwtCheck, jwtParse, MyRestaurantController.getMyRestaurant);

router.post("/", 
Upload.single("imageFile"), 
validateMyRestaurantRequest, 
jwtCheck, 
jwtParse, 
MyRestaurantController.createMyRestaurant);

router.put(
    "/",
    Upload.single("imageFile"), 
    validateMyRestaurantRequest,
    jwtCheck,
    jwtParse,
    MyRestaurantController.updateMyRestaurant
  );

export default router;
