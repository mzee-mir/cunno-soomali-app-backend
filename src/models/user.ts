import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema({
    auth0Id: {
        type: String,
    },
    name:{
        type: String,
        required : [true, "provide Name"],
    },
    addressLine1:{
        type: String,
    },
    email : {
        type : String,
        required : [true, "provide email"],
        unique : true
    },
    password : {
        type : String,
        required : [true, "provide password"]
    },
    avatar : {
        type : String,
        default : ""
    },
    mobile : {
        type : Number,
        default : null
    },
    refresh_token : {
        type : String,
        default : ""
    },
    resetToken : {
        type : String,
        default : ""
    },
    verify_email : {
        type : Boolean,
        default : false
    },
    verify_email_otp: { type: String },
    verify_email_otp_expiry: { type: Date },
    
    last_login_date : {
        type : Date,
        default : ""
    },
    status : {
        type : String,
        enum : ["Active","Inactive","Suspended"],
        default : "Active"
    },
    address_details : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'address'
        }
    ],
    shopping_cart : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'cartProduct'
        }
    ],
    orderHistory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'order'
        }
    ],
    forgot_password_otp : {
        type : String,
        default : null
    },
    forgot_password_expiry : {
        type : Date,
        default : ""
    },
    reset_token : {
        type : String,
        default : null
    },
    reset_token_expiry : {
        type : Date,
        default : null
    },
    role : { 
        type: String, 
        enum: ['USER', 'RESTAURANT OWNER', 'ADMIN'], 
        default: 'USER' },
    
    ownedRestaurants: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Restaurant' 
    }],
    city:{
        type: String,
    },
    country:{
        type: String,
    },
   },{
        timestamps : true
    })
const User = mongoose.model("User", userSchema);
export default User;