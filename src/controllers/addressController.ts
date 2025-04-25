import AddressModel from "../models/Address";
import User from "../models/user"; 
import { Request, Response } from "express";

const addAddressController = async(req: Request, res: Response) => {
    try {
        const userId = req.userId // middleware
        const { address_line , city, state, pincode, country,mobile } = req.body

        const createAddress = new AddressModel({
            address_line,
            city,
            state,
            country,
            pincode,
            mobile,
            userId : userId 
        })
        const saveAddress = await createAddress.save()

        const addUserAddressId = await User.findByIdAndUpdate(userId,{
            $push : {
                address_details : saveAddress._id
            }
        })

        return res.json({
            message : "Address Created Successfully",
            error : false,
            success : true,
            data : saveAddress
        })

    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}

const getAddressController = async(req: Request, res: Response) => {
    try {
        const userId = req.userId // middleware auth

        const data = await AddressModel.find({ userId : userId }).sort({ createdAt : -1})

        return res.json({
            data : data,
            message : "List of address",
            error : false,
            success : true
        })
    } catch (error) {
        return res.status(500).json({
            message : error ,
            error : true,
            success : false
        })
    }
}

const updateAddressController = async(req: Request, res: Response) => {
    try {
        const userId = req.userId // middleware auth 
        const { _id, address_line,city,state,country,pincode, mobile } = req.body 

        const updateAddress = await AddressModel.updateOne({ _id : _id, userId : userId },{
            address_line,
            city,
            state,
            country,
            mobile,
            pincode
        })

        return res.json({
            message : "Address Updated",
            error : false,
            success : true,
            data : updateAddress
        })
    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}

const deleteAddresscontroller = async(req: Request, res: Response) => {
    try {
        const userId = req.userId // auth middleware    
        const { _id } = req.body 

        const disableAddress = await AddressModel.updateOne({ _id : _id, userId},{
            status : false
        })

        return res.json({
            message : "Address remove",
            error : false,
            success : true,
            data : disableAddress
        })
    } catch (error) {
        return res.status(500).json({
            message : error,
            error : true,
            success : false
        })
    }
}

export default {
    addAddressController,
    getAddressController,
    updateAddressController,
    deleteAddresscontroller
} 