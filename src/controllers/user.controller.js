import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    this.refreshToken = refreshToken;

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

const logoutUser = asyncHandler(async (req, res) =>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true, // Cookie cannot be accessed via JavaScript.
    secure: true, // Ensures the cookie is only sent over HTTPS.
  };

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "user loggedout"))
}) 

export { registerUser, loginUser, logoutUser };
