const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
    name: {
        type: String,
        trim: true
    },

    username:{
        type:String,
        required:true,
        trim:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },

    phone: {
        type: String,
        trim: true
    },

    store: {
        name: { type: String, trim: true },
        categoryId: { type: String, trim: true },
        address: { type: String, trim: true },
        area: { type: String, trim: true },
        city: { type: String, trim: true },
        pincode: { type: String, trim: true },
        location: {
            latitude: Number,
            longitude: Number
        }
    },

    password:{
        type:String,
        select:false
    },

    avatar:{
        type:String,
        default:""
    },

    role:{
        type:String,
        enum:["user","admin"],
        default:"user"
    },

    isVerified:{
        type:Boolean,
        default:false
    },

    verificationToken:{
        type:String,
        select:false
    },

    refreshToken:{
        type:String,
        select:false
    },

    resetPasswordToken:{
        type:String,
        select:false
    },

    resetPasswordExpire:Date,

    lastLogin:Date
},
{
    timestamps:true
});

module.exports = mongoose.model("User", userSchema);
