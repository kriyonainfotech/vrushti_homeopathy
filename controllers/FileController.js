const Patient = require('../models/PatientModel');
const { uploadStream } = require('../utils/cloudinary');
const cloudinary = require('cloudinary').v2;

// @desc    Upload Investigation File (PDF/Image)
// @route   POST /api/v1/files/upload
// @access  Protected (Staff/Admin)
exports.uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded. Please include a file named "file" in the form data.' });
        }

        const { originalname, buffer, mimetype } = req.file;
        // patientId is expected in the form data body
        const patientId = req.body.patientId; 

        if (!patientId) {
             // If patientId is missing, destroy the uploaded file immediately to save space
             console.error(`[ERROR] File upload failed: patientId missing. Attempting to destroy file.`);
             // Note: Since we are using stream upload, destruction is not needed if the stream hasn't been fully resolved.
             return res.status(400).json({ success: false, error: 'Please provide the patientId in the form data.' });
        }
        
        // Determine resource type: 'raw' for PDFs, 'image' for others
        const isPdf = mimetype === 'application/pdf';
        const resourceType = isPdf ? 'raw' : 'image'; 
        const folder = `clinic_app/patient_reports/${patientId}`; // Organized storage in Cloudinary

        // 1. Upload file to Cloudinary (using stream for efficiency and optimization)
        const result = await uploadStream(buffer, folder, resourceType, mimetype);

        // 2. Prepare metadata for MongoDB
        const fileMetadata = {
            fileName: originalname,
            // The URL points to the transformed (compressed, format-optimized) file
            url: result.secure_url, 
            publicId: result.public_id,
            mimeType: mimetype,
        };

        // 3. Save metadata to the Patient's investigationFiles array
        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { $push: { investigationFiles: fileMetadata } },
            { new: true, runValidators: true, select: 'investigationFiles name' }
        );

        if (!patient) {
            // If patient ID is invalid, we must destroy the uploaded file from Cloudinary
            await cloudinary.uploader.destroy(result.public_id);
            return res.status(404).json({ success: false, error: `Patient with ID ${patientId} not found. File upload aborted and file deleted from cloud.` });
        }
        
        // Respond with the uploaded file metadata
        console.log(`[LOG] File uploaded to Cloudinary and saved to patient ID: ${patientId}. URL: ${result.secure_url}`);
        res.status(201).json({
            success: true,
            data: fileMetadata,
            message: 'File uploaded and linked to patient successfully.'
        });

    } catch (err) {
        console.error(`[ERROR] File upload failed: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error during file upload/database save.', details: err.message });
    }
};

// @desc    Delete Investigation File
// @route   DELETE /api/v1/files/:patientId/delete/:fileId
// @access  Protected (Staff/Admin)
exports.deleteFile = async (req, res, next) => {
    try {
        const { patientId, fileId } = req.body;

        // 1. Find the patient and the file metadata to get the Cloudinary publicId
        const patient = await Patient.findOne(
            { _id: patientId, 'investigationFiles._id': fileId },
            { 'investigationFiles.$': 1 } // Project only the matching file
        );

        if (!patient || patient.investigationFiles.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient or File ID not found.' });
        }
        
        const publicId = patient.investigationFiles[0].publicId;

        // 2. Delete the file from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result !== 'ok' && result.result !== 'not found') {
            console.warn(`[WARNING] Cloudinary delete failed for ${publicId}. Result: ${result.result}`);
            // We proceed with database deletion unless it was a server error
        }

        // 3. Delete the file metadata from MongoDB using $pull
        await Patient.findByIdAndUpdate(
            patientId,
            { $pull: { investigationFiles: { _id: fileId } } },
            { new: true }
        );

        console.log(`[LOG] File ID ${fileId} deleted from Cloudinary (${publicId}) and MongoDB.`);
        res.status(200).json({
            success: true,
            message: 'Investigation file deleted successfully.'
        });

    } catch (err) {
        console.error(`[ERROR] Failed to delete file: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error during file deletion.', details: err.message });
    }
};