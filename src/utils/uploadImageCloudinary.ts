import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';

cloudinary.config({
    cloud_name : process.env.CLODINARY_CLOUD_NAME,
    api_key : process.env.CLODINARY_API_KEY,
    api_secret : process.env.CLODINARY_API_SECRET_KEY
})

interface CloudinaryResponse {
    url: string;
    // Add other properties if needed
}

const uploadImageClodinary = async(image: Express.Multer.File): Promise<CloudinaryResponse> => {
    const buffer = image.buffer;

    const uploadImage = await new Promise<CloudinaryResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: "Cunno-somali" }, (error, uploadResult) => {
            if (error) reject(error);
            return resolve(uploadResult as CloudinaryResponse);
        }).end(buffer);
    });

    return uploadImage;
}

export default uploadImageClodinary