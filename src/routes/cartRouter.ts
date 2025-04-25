import { Router } from "express";
import authentications from "../middleware/authentications";
import { addToCartItemController, deleteCartItemQtyController, getCartItemController, updateCartItemQtyController } from "../controllers/CartController";

const cartRouter = Router()

cartRouter.post('/create-cart',authentications,addToCartItemController)
cartRouter.get("/get-cart",authentications,getCartItemController)
cartRouter.put('/update-qty',authentications,updateCartItemQtyController)
cartRouter.delete('/delete-cart-item',authentications,deleteCartItemQtyController)

export default cartRouter