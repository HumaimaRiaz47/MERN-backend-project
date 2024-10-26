import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    console.log("email:", email);

    // Check if any required field is empty
    if ([fullName, email, username, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    //check if user already exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "user already exists")
    }

    //save image and coverimage at local path and aply validation for avatar image

    const avatarLocalpath = req.files?.avatar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

    if(!avatarLocalpath){
        throw new ApiError(400, "avatar file is required")
    }

    //console.log(req.files)

    //upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalpath)
    const coverImage = await uploadOnCloudinary(coverImageLocalpath)

    if(!avatar){
        throw new ApiError(400, "avatar is required")
    }

    //create object of user in db 
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Retrieve the created user without sensitive information
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

     // Check if the user was created successfully
    if(!createdUser){
        throw new ApiError(500, "something went wrong while registering a user")
    }

    //response to user
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully")
    )

    // Respond only if all fields are provided
    res.status(200).json({
        message: "ok"
    });
});

export { registerUser };
