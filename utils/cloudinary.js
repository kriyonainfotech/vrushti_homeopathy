const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configuration assumed to be in .env file
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a buffer (from multer memory storage) to Cloudinary.
 * Applies maximum possible compression and optimization.
 * @param {Buffer} buffer - The file buffer from multer.
 * @param {string} folder - The destination folder in Cloudinary (e.g., 'clinic_app/reports').
 * @param {string} resourceType - 'auto' or 'raw' for PDFs, 'image' for images.
 * @param {string} mimeType - The file's MIME type to determine specific transformations.
 * @returns {Promise<object>} The Cloudinary result object.
 */
exports.uploadStream = (buffer, folder, resourceType, mimeType) => {
    
    // --- Default Transformation (for Images) ---
    let transformationOptions = {
        // Automatically selects the best format (e.g., WebP, AVIF)
        fetch_format: 'auto', 
        // Automatically selects the optimal quality level
        quality: 'auto',       
        // Constrain width to 1024px for mobile viewing efficiency
        width: 1024,
        crop: "limit"
    };

    // --- Specific Compression Logic for PDFs (Raw files) ---
    if (mimeType === 'application/pdf' || resourceType === 'raw') {
        // For PDF documents, force conversion to JPG and compress aggressively.
        // This makes documents load quickly as images on the mobile app.
        transformationOptions = {
            // Force output format to JPG
            fetch_format: 'jpg', 
            // Use low quality for better compression of text/report images
            quality: 'auto:low', 
            // Constrain width for mobile viewing
            width: 1024, 
            crop: "limit",
            // Cloudinary feature: treats the PDF as a document
            resource_type: 'image' 
        };
    }


    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
            { 
                folder: folder,
                resource_type: resourceType,
                ...transformationOptions, // Apply the chosen transformations
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