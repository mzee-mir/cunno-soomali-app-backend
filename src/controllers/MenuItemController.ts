import { Request, Response } from "express";
import MenuItems, { IMenuItem } from "../models/MenuItems";
import Restaurant from "../models/Restaurant";
import uploadImageCloudinary from "../utils/uploadImageCloudinary";
import cloudinary from "cloudinary";
import mongoose from "mongoose";


const getRestaurantMenu = async (req: Request, res: Response) => {
    try {
        const { restaurantId } = req.params;

        // ✅ Find restaurant and populate menuItems
        const restaurant = await Restaurant.findById(restaurantId).populate({
            path: "menuItems",
            select: "-__v -createdAt -updatedAt", // Exclude unnecessary fields
        });

        // ❌ Restaurant not found
        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found",
                error: true,
                success: false,
            });
        }

        return res.json({
            message: "Menu retrieved successfully",
            data: restaurant.menuItems,
            success: true,
            error: false,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error fetching menu",
            error: true,
            success: false,
        });
    }
};

  const getProductById = async (req: Request, res: Response) => {
    try {
      const MenuItem = await MenuItems.findById(req.params.id);
  
      if (!MenuItem) {
        return res.status(404).json({ message: "MenuItems not found" });
      }
  
      res.json(MenuItem);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Something went wrong" });
    }
  };
  const createMenuItem = async (req: Request, res: Response) => {
    try {
        console.log('Request body:', req.body); // Log incoming data
        console.log('File:', req.file); // Check if file exists
        
        const { restaurantId } = req.params;
        const { name, price, description, stock, discount, publish, imageUrl } = req.body;

        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({
                message: "Name and price are required fields",
                error: true,
                success: false
            });
        }

        // ✅ Find the restaurant
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            console.log(`Restaurant not found with ID: ${restaurantId}`);
            return res.status(404).json({
                message: "Restaurant not found",
                error: true,
                success: false,
            });
        }

        // ✅ Create a new menu item
        const newMenuItem = new MenuItems({
            name,
            price: Number(price), // Ensure it's a number
            description: description || "",
            stock: stock ?? true,
            discount: discount ? Number(discount) : null,
            publish: publish ?? true,
            imageUrl: imageUrl || "",
            restaurant: restaurantId
        });

        // ✅ Save the menu item
        const savedMenuItem = await newMenuItem.save();
        console.log('Saved menu item:', savedMenuItem);

        // ✅ Add the menu item to the restaurant
        restaurant.menuItems.push(savedMenuItem._id);
        await restaurant.save();

        return res.status(201).json({
            message: "Menu item added successfully",
            data: savedMenuItem,
            success: true,
            error: false,
        });
    } catch (error) {
        console.error('Detailed error:', error); // More detailed error logging
        return res.status(500).json({
            message: "Error adding menu item",
            error: true,
            success: false,
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

const uploadMenuItemImage = async (req: Request, res: Response) => {
    try {
        const { restaurantId, menuItemId } = req.params;
        const userId = req.userId;

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
                error: true,
                success: false
            });
        }

        // Verify restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found",
                error: true,
                success: false
            });
        }

        // Find the menu item and verify ownership
        const menuItem = await MenuItems.findOne({
            _id: menuItemId,
            restaurant: restaurantId
        });
        
        if (!menuItem) {
            return res.status(404).json({
                message: "Menu item not found in this restaurant",
                error: true,
                success: false
            });
        }

        // Upload to Cloudinary
        const upload = await uploadImageCloudinary(req.file);

        // Delete old image if exists
        if (menuItem.imageUrl) {
            try {
                await cloudinary.v2.uploader.destroy(
                    menuItem.imageUrl.split('/').pop()?.split('.')[0] || ''
                );
            } catch (error) {
                console.log("Error deleting old image:", error);
            }
        }

        // Update menu item
        menuItem.imageUrl = upload.url;
        const updatedMenuItem = await menuItem.save();

        return res.json({
            message: "Menu item image uploaded successfully",
            success: true,
            error: false,
            data: updatedMenuItem
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            message: "Failed to upload menu item image",
            error: true,
            success: false,
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

const updateMenuItem = async (req: Request, res: Response) => {
    try {
        const { restaurantId, menuItemId } = req.params;
        const { name, price, description, stock, discount, publish } = req.body;

        // ✅ Check if restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                message: "Restaurant not found",
                error: true,
                success: false,
            });
        }

        // ✅ Check if menu item exists and belongs to the restaurant
        const menuItem = await MenuItems.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({
                message: "Menu item not found",
                error: true,
                success: false,
            });
        }

        // ✅ Handle image update if a new file is uploaded
        if (req.file) {
            const result = await cloudinary.v2.uploader.upload(req.file.path);
            menuItem.imageUrl = result.secure_url;
        }

        // ✅ Update menu item fields if provided
        if (name) menuItem.name = name;
        if (price) menuItem.price = price;
        if (description) menuItem.description = description;
        if (stock !== undefined) menuItem.stock = stock;
        if (discount !== undefined) menuItem.discount = discount;
        if (publish !== undefined) menuItem.publish = publish;

        // ✅ Save updated menu item
        const updatedMenuItem = await menuItem.save();

        return res.json({
            message: "Menu item updated successfully",
            data: updatedMenuItem,
            success: true,
            error: false,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Error updating menu item",
            error: true,
            success: false,
        });
    }
};

const softDeleteMenuItem = async (req: Request, res: Response) => {
  try {
      const { menuItemId } = req.params;
      const userID = req.userId; // Assuming auth middleware sets `req.userID`

      // Find menu item
      const menuItem = await MenuItems.findById(menuItemId);
      if (!menuItem || menuItem.isDeleted) {
          return res.status(404).json({
              message: "Menu item not found or already deleted",
              error: true,
              success: false,
          });
      }

      // Soft delete by setting isDeleted to true
      menuItem.isDeleted = true;
      menuItem.deletedAt = new Date();
      menuItem.deletedBy = new mongoose.Types.ObjectId(userID);
      await menuItem.save();

      return res.json({
          message: "Menu item soft deleted successfully",
          success: true,
          error: false,
          deletedBy: userID,
          deletedAt: menuItem.deletedAt
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({
          message: "Error deleting menu item",
          error: true,
          success: false,
      });
  }
};

const restoreMenuItem = async (req: Request, res: Response) => {
  try {
      const { menuItemId } = req.params;
      const userID = req.userId;

      // Find menu item
      const menuItem = await MenuItems.findById(menuItemId);
      if (!menuItem || !menuItem.isDeleted) {
          return res.status(404).json({
              message: "Menu item not found or not deleted",
              error: true,
              success: false,
          });
      }

      // Restore the menu item
      menuItem.isDeleted = false;
      menuItem.deletedAt = new Date();
      menuItem.deletedBy = new mongoose.Types.ObjectId(userID);;
      menuItem.restoredAt = new Date();
      menuItem.restoredBy = new mongoose.Types.ObjectId(userID);;
      await menuItem.save();

      return res.json({
          message: "Menu item restored successfully",
          success: true,
          error: false,
          restoredBy: userID,
          restoredAt: menuItem.restoredAt
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({
          message: "Error restoring menu item",
          error: true,
          success: false,
      });
  }
};


const hardDeleteMenuItem = async (req: Request, res: Response) => {
  try {
      const { menuItemId } = req.params;
      const userID = req.userId;

      const menuItem = await MenuItems.findById(menuItemId);
      if (!menuItem) {
          return res.status(404).json({
              message: "Menu item not found",
              error: true,
              success: false,
          });
      }

      await MenuItems.findByIdAndDelete(menuItemId);

      return res.json({
          message: "Menu item permanently deleted",
          success: true,
          error: false,
          deletedBy: userID,
          deletedAt: new Date()
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({
          message: "Error permanently deleting menu item",
          error: true,
          success: false,
      });
  }
};



export default {
    getRestaurantMenu,
    getProductById,
    createMenuItem,
    updateMenuItem,
    uploadMenuItemImage,
    hardDeleteMenuItem,
    softDeleteMenuItem,
    restoreMenuItem
}          