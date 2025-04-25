import mongoose from "mongoose";

const cartMenuItemSchema = new mongoose.Schema({
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItems' 
    },
    quantity : {
        type : Number,
        default : 1
    },
    userId : {
        type : mongoose.Schema.ObjectId,
        ref : "User"
    }
},{
    timestamps : true
})

const CartMenuItem = mongoose.model('cartmenuitem',cartMenuItemSchema)

export default CartMenuItem