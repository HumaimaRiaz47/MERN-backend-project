import { ApiError } from "../utils/ApiError.js"; // Custom error class to handle API errors
import { asyncHandler } from "../utils/asyncHandler.js"; // Utility to handle async errors in routes
import jwt from "jsonwebtoken"; // JSON Web Token library for token verification
import { User } from "../models/user.model.js"; // User model for database interactions

// Middleware to verify JWT (access token) for protected routes
export const verifyJwt = asyncHandler(async (req, _, next) => {
  try {
    // Retrieve the token from cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    // Check if token exists; if not, throw an unauthorized error
    if (!token) {
      throw new ApiError(401, "unauthorized request"); // No token provided
    }

    // Decode and verify the token using the secret key
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user in the database using the ID from the token, excluding sensitive fields
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    // If user is not found, throw an invalid token error
    if (!user) {
      throw new ApiError(401, "invalid access token"); // Token doesn't match any user
    }

    // Attach the authenticated user to the request object for use in subsequent middleware/routes
    req.user = user;

    // Pass control to the next middleware or route handler
    next();
  } catch (error) {
    // Handle token verification errors and send an appropriate response
    throw new ApiError(401, error?.message || "invalid access token");
  }
});
