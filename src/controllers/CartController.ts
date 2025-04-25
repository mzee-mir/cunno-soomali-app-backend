import CartProductModel from "../models/cartMenuItem";
import MenuItems from "../models/MenuItems";
import UserModel from "../models/user";
import { Request, Response } from "express";


// Update addToCartItemController
export const addToCartItemController = async(req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { menuItemId } = req.body;
        
        if(!menuItemId) {
            return res.status(400).json({ // Changed from 402 to 400
                message: "Provide menuItemId",
                error: true,
                success: false
            });
        }

        // Check if menu item exists
        const menuItem = await MenuItems.findById(menuItemId);
        if(!menuItem) {
            return res.status(404).json({
                message: "Menu item not found",
                error: true,
                success: false
            });
        }

        // Find existing cart item and update quantity
        let cartItem = await CartProductModel.findOne({
            userId: userId,
            menuItemId: menuItemId
        });

        if(cartItem) {
            cartItem.quantity += 1;
            const savedItem = await cartItem.save();
            return res.json({
                data: savedItem,
                message: "Item quantity updated",
                error: false,
                success: true
            });
        }

        // Create new cart item
        const newCartItem = new CartProductModel({
            quantity: 1,
            userId: userId,
            menuItemId: menuItemId
        });
        
        const savedCartItem = await newCartItem.save();

        return res.json({
            data: savedCartItem,
            message: "Item added successfully",
            error: false,
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            error: true,
            success: false
        });
    }
}

// Update getCartItemController
export const getCartItemController = async(req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const cartItems = await CartProductModel.find({ userId })
            .populate({
                path: 'menuItemId',
                select: 'name price imageUrl stock discount',
                match: { isDeleted: false } // Add this if using soft delete
            })
            .lean();

        // Filter out null menu items
        const validCartItems = cartItems.filter(item => item.menuItemId !== null);

        return res.json({
            data: validCartItems,
            error: false,
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            error: true,
            success: false
        });
    }
}

export const updateCartItemQtyController = async(req: Request, res: Response) => {
    try {
        const userId = req.userId 
        const { _id,qty } = req.body

        if(!_id ||  !qty){
            return res.status(400).json({
                message : "provide _id, qty"
            })
        }

        const updateCartitem = await CartProductModel.updateOne({
            _id : _id,
            userId : userId
        },{
            quantity : qty
        })

        return res.json({
            message : "Update cart",
            success : true,
            error : false, 
            data : updateCartitem
        })

    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}

export const deleteCartItemQtyController = async(req: Request, res: Response) => {
    try {
      const userId = req.userId // middleware
      const { _id } = req.body 
      
      if(!_id){
        return res.status(400).json({
            message : "Provide _id",
            error : true,
            success : false
        })
      }

      const deleteCartItem  = await CartProductModel.deleteOne({_id : _id, userId : userId })

      return res.json({
        message : "Item remove",
        error : false,
        success : true,
        data : deleteCartItem
      })

    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}