import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    // Fetch the user object from the database using the given userId.
    const user = await User.findById(userId);

    // Generate an access token for the user.
    // This is typically short-lived and used for immediate API access.
    const accessToken = user.generateAccessToken();

    // Generate a refresh token for the user.
    // This is longer-lived and used to refresh the access token.
    const refreshToken = user.generateRefreshToken();

    // Store the newly generated refresh token in the user object.
    // This allows the server to validate the token later.
    user.refreshToken = refreshToken;

    // Save the user object back to the database.
    // `validateBeforeSave: false` skips model validation to avoid additional processing.
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    // Handle any error that occurs during the token generation process.
    // Throws a custom API error with a status code of 500 and an error message.
    throw new ApiError(500, "Error while generating refresh and access tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validate - not empty
  //check if the user alresdy exists or not : username, email
  //check for images and avatar
  //create user object - create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return response

  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  // if(fullName === ""){
  //     throw new ApiError(400, "full name required")
  //}

  // Check if any required field is empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //check if user already exists or not
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user already exists");
  }

  //save image and coverimage at local path and apply validation for avatar image

  const avatarLocalpath = req.files?.avatar[0]?.path;
  // const coverImageLocalpath = req.files?.coverImage[0]?.path;

  let coverImageLocalpath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalpath = req.files.coverImage[0].path;
  }

  if (!avatarLocalpath) {
    throw new ApiError(400, "avatar file is required");
  }

  //console.log(req.files)

  //upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalpath);
  const coverImage = coverImageLocalpath
    ? await uploadOnCloudinary(coverImageLocalpath)
    : null;

  if (!avatar) {
    throw new ApiError(400, "avatar is required");
  }

  //create object of user in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Retrieve the created user without sensitive information
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Check if the user was created successfully
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering a user");
  }

  //response to user
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));

  // Respond only if all fields are provided
  res.status(200).json({
    message: "ok",
  });
});

const loginUser = asyncHandler(async (req, res) => {
  // Extract the username, email, and password from the request body.
  const { username, email, password } = req.body;

  // Ensure either a username or email is provided; otherwise, throw a validation error.
  if (!(username || email)) {
    throw new ApiError(400, "username or email required");
  }

  // Attempt to find a user in the database using either the email or username.
  const user = await User.findOne({
    $or: [{ email }, { username }], // Searches for a user with a matching email or username.
  });

  // If no user is found, throw an error indicating the username or email doesn't exist.
  if (!user) {
    throw new ApiError(402, "username or email not found");
  }

  // Verify that the provided password matches the stored hashed password.
  const isPasswordValid = await user.isPasswordCorrect(password);

  // If the password is incorrect, throw an error for invalid credentials.
  if (!isPasswordValid) {
    throw new ApiError(405, "incorrect user credentials");
  }

  // Generate an access token and refresh token for the authenticated user.
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // Fetch the user's details again, excluding sensitive fields like password and refreshToken.
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken" // Omits sensitive fields from the result.
  );

  // Define options for setting secure HTTP-only cookies.
  const options = {
    httpOnly: true, // Cookie cannot be accessed via JavaScript.
    secure: true, // Ensures the cookie is only sent over HTTPS.
  };

  // Respond with a success status, setting the tokens in secure cookies and returning the user data.
  return res
    .status(200)
    .cookie("accessToken", accessToken, options) // Store the access token in a secure cookie.
    .cookie("refreshToken", refreshToken, options) // Store the refresh token in a secure cookie.
    .json(
      new ApiResponse(
        200, // HTTP status code for success.
        {
          user: loggedInUser, // Return the user's details (excluding sensitive fields).
          accessToken, // Provide the access token.
          refreshToken, // Provide the refresh token.
        },
        "user logged in successfully" // Success message.
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true, // Cookie cannot be accessed via JavaScript.
    secure: true, // Ensures the cookie is only sent over HTTPS.
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user loggedout"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //get refresh token from cookies if mobile from body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  //if no token throw an error
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    //verify the refreshtoken via jwt.verify decode the user's token
    // so that we can compare with the db token
    // bcz the users token is in encrypted form
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    //match the generated token which is saved in db to incoming token
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "REFRESH TOKWN IS expird or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { refreshToken, newAccessToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("access Token", newAccessToken)
      .cookie("refresh token", refreshToken)
      .json(
        new ApiResponse(
          200,
          { refreshToken, accessToken: newAccessToken },
          "access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invaid refresh token ");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //take pasword from user
  const { oldPassword, newPassword } = req.body;

  //find user by id
  const user = await User.findById(req.user?._id);
  //math the old password to the exisiting password in db
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  //if password not matched
  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  //save the password in user
  user.password = newPassword;
  user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password successfully changed"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "ACCOUNT DETAILS UPDATED"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalpath = req.file?.path;

  if (!avatarLocalpath) {
    throw new ApiError(400, "avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalpath);

  if (!avatar.url) {
    throw new ApiError(400, "error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(200, user, "avatar image updated successfully");
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  // Extract the local file path of the uploaded cover image from the request
  const coverImageLocalpath = req.file?.path;

  // If no file was uploaded, throw an error
  if (!coverImageLocalpath) {
    throw new ApiError(400, "cover image file is missing");
  }

  // Upload the image to a cloud storage service (e.g., Cloudinary)
  const coverImage = await uploadOnCloudinary(coverImageLocalpath);

  // If the upload fails and no URL is returned, throw an error
  if (!coverImage.url) {
    throw new ApiError(400, "error while uploading cover image");
  }

  // Find the logged-in user by their ID and update their cover image URL in the database
  const user = await User.findByIdAndUpdate(
    req.user?._id, // User ID from the request (assumed to be set by authentication middleware)
    {
      $set: {
        coverImage: coverImage.url, // Set the new cover image URL
      },
    },
    { new: true } // Return the updated user object
  ).select("-password"); // Exclude the password field from the returned user object

  // Send a success response with the updated user data
  return res
    .status(200) // Set HTTP status to 200 (success)
    .json(200, user, "cover image updated successfully");
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },

    {
      //subscriber ref to user the local field acc to user is id
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers", //no. of subscriber of each channel has
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo", //list of channels a user subscribed to
      },
    },

    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },

        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },

  ]);

  if(!channel?.length){
    throw new ApiError(404, "channel does not exists")
  }

  return res
  .status(200)
  .json(new ApiResponse(200, channel[0], "user channel fetch successfully"))


});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
