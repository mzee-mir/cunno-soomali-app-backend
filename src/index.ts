import express,{Request,Response} from"express";
import cors from"cors";
import "dotenv/config";
import mongoose from "mongoose";
import myUserRoutes from "./routes/myUserRoutes";
import{v2 as cloudinary} from "cloudinary";
import MyRestaurantRoute from "./routes/MyRestaurantRoute";
import Restaurant from "./models/Restaurant";
import Restaurent from "./routes/Restaurent";
import OrderRoutes from "./routes/OrderRoutes";
import Order from "./models/Order";
import MyRestaurantController from './controllers/MyRestaurantController';
import OrderController from "./controllers/OrderController";





mongoose.connect(process.env.MONGODB_CONNECTION_STRING  as string).then(() => console.log("Connected to database"));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})



const app = express();

app.use(cors())

app.use("/api/order/checkout/webhook", express.raw({ type: "*/*" }))

app.use(express.json());

app.get("/health", async(req:Request, res:Response)=> {
    res.send ({message: "health Ok! "});
});

app.use("/api/my/user", myUserRoutes);

app.use("/api/my/restaurant", MyRestaurantRoute);

app.use("/api/restaurant", Restaurent);

app.use("/api/order", OrderRoutes)




app.listen(3000, () => {
    console.log("Server is running on port 3000");
});