import express,{Request,Response} from"express";
import cors from"cors";
import "dotenv/config";
import mongoose from "mongoose";
import myUserRoutes from "./routes/myUserRoutes";


mongoose.connect(process.env.MONGODB_CONNECTION_STRING  as string).then(() => console.log("Connected to database"));



const app = express();
app.use(express.json());
app.use(cors())

app.get("/health", async(req:Request, res:Response)=> {
    res.send ({message: "health Ok! "});
});

app.use("/api/my/user", myUserRoutes);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});