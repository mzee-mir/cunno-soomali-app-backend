import jwt from 'jsonwebtoken'
import User from '../models/user'


const generatedRefreshToken = async(userId: string)=>{

    if (!process.env.SECRET_KEY_REFRESH_TOKEN) {    
        throw new Error('SECRET_KEY_REFRESH_TOKEN is not defined');
    }

    const token = await jwt.sign({ _id : userId},
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn : '7d'}
    )

    const updateRefreshTokenUser = await User.updateOne(
        { _id : userId},
        {
            refresh_token : token
        }
    )

    return token
}

export default generatedRefreshToken