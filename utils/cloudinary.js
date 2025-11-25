const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuration assumed to be in .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


exports.uploadStream = (buffer, folder, resourceType) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resourceType,
                // --- PDF Compression & Optimization (for documents/reports) ---
                // For PDF, force JPG format and compress to reduce size.
                // We use auto quality and a max width for reports to ensure fast loading on mobile.
                transformation: [
                    { quality: "auto:low", width: 1024, crop: "limit", format: "jpg" }
                ]
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );

        // Convert buffer to readable stream and pipe it to cloudinary
        streamifier.createReadStream(buffer).pipe(stream);
    });
};  