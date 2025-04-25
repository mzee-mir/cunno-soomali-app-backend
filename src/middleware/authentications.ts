import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
      interface Request {
        userId: string;
      }
    }
  }
  
  

const authentications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract token from cookies or Authorization header
        const token = req.cookies.accessToken || req?.headers?.authorization?.split(" ")[1];

        console.log('Token:', token); // Debugging: Log the token

        // Check if token is provided
        if (!token) {
            return res.status(401).json({
                message: "No token provided. Please log in.",
                error: true,
                success: false
            });
        }

        // Verify the token
        const decode = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN || "") as JwtPayload;

        // Check if the token is valid
        if (!decode) {
            return res.status(401).json({
                message: "Unauthorized access. Invalid token.",
                error: true,
                success: false
            });
        }

        console.log('Decoded token:', decode); // Debugging: Log the decoded token

        // Attach the user ID to the request object
        req.userId = decode.userId || decode.id || decode._id;; // Ensure `_id` matches the token payload

        // Proceed to the next middleware or route handler
        next();

    } catch (error) {
        console.error('Authentication error:', error); // Debugging: Log the error
        return res.status(401).json({
            message: "Unauthorized. Please log in again.",
            error: true,
            success: false
        });
    }
};

export default authentications;