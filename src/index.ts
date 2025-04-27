import express,{Request,Response} from"express";
import cors from"cors";
import "dotenv/config";
import mongoose from "mongoose";
import{v2 as cloudinary} from "cloudinary";
import OrderRoutes from "./routes/OrderRoutes";
//import OrderController from "./controllers/OrderController";
import UserAuthRoutes from "./routes/UserAuthRoutes";
import RestaurantAuthRoutes from "./routes/RestaurantAuthRoutes";
import cookieParser from 'cookie-parser';
import MenuItemRoutes from "./routes/MenuItemRoutes";
import addressRouter from "./routes/Address";
import cartRouter from "./routes/cartRouter";
import AnalyticalRouter from "./routes/AnalyticalRoutes";
import DashboardRoutes from "./routes/DashboardRoutes";
import NotificationRoutes from "./routes/NotificationRoutes";
import http from 'http';
import { initializeWebSocketServer } from './seervices/webSocketService';





mongoose.connect(process.env.MONGODB_CONNECTION_STRING  as string).then(() => console.log("Connected to database"));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})



const app = express();

app.use(
    cors({
      origin: 'http://localhost:5173','https://cunno-soomali-app-frontend.onrender.com' // Allow requests from this origin
      credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    })
  );

app.use("/api/order/checkout/webhook", express.raw({ type: "*/*" }))

app.use(express.json());

app.get("/health", async(req:Request, res:Response)=> {
    res.send ({message: "health Ok! "});
});

app.use(cookieParser());

app.use("/api/order", OrderRoutes)

app.use("/api/notification", NotificationRoutes)
app.use("/api/user", UserAuthRoutes)
app.use("/api/user/address", addressRouter)
app.use("/api/user/cart", cartRouter)
app.use("/api/analytics", AnalyticalRouter)  // Mount analytics first
app.use("/api/restaurant", RestaurantAuthRoutes)
app.use("/api/restaurant", MenuItemRoutes)
app.use("/api/Dashboard", DashboardRoutes);

const server = http.createServer(app);
initializeWebSocketServer(server);


server.listen(3000, () => {
    console.log("Server is running on port 3000");
});