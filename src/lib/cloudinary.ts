// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * @param fileBuffer - The image file buffer
 * @param folder - The folder to upload to (e.g., 'idu', 'questions', 'messages', 'explanations')
 * @returns The secure URL of the uploaded image
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `qbank/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' } // Automatic optimization
        ],
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload Error]', error);
          reject(error);
        } else if (result) {
          // Successfully uploaded
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed with no result'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete an image from Cloudinary
 * @param imageUrl - The Cloudinary URL to delete
 */
export async function deleteFromCloudinary(imageUrl: string): Promise<void> {
  try {
    // Extract public_id from URL
    // Example: https://res.cloudinary.com/demo/image/upload/v1234/qbank/idu/abc123.jpg
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }
    
    // Get everything after 'upload/v1234/' (version is optional)
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
    const publicId = pathAfterUpload.replace(/\.[^.]+$/, ''); // Remove file extension
    
    await cloudinary.uploader.destroy(publicId);
    // Successfully deleted
  } catch (error) {
    console.error('[Cloudinary Delete Error]', error);
    throw error;
  }
}

export default cloudinary;
