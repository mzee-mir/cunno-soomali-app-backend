import jwt from 'jsonwebtoken';
import "dotenv/config";

const generatedAccessToken = async (userId: string) => {
    if (!process.env.SECRET_KEY_ACCESS_TOKEN) {
        throw new Error('SECRET_KEY_ACCESS_TOKEN is not defined');
    }

    const token = await jwt.sign(
        { _id: userId }, // Ensure this matches the middleware's `decode._id`
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn: '5h' }
    );

    return token;
};

export default generatedAccessToken;