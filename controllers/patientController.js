const Patient = require('../models/PatientModel');
const { uploadStream } = require('../utils/cloudinary');
const DatauriParser = require('datauri/parser');

exports.createPatient = async (req, res, next) => {
    try {
        const { name, age, gender, phoneNumber, address, consultationDate } = req.body;

        // --- Validate Required Fields ---
        if (!name || !age || !gender || !phoneNumber || !consultationDate) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: name, age, gender, phone number, and consultation date.",
            });
        }

        // --- Create Patient Entry ---
        const patient = await Patient.create({
            ...req.body,
        });

        console.log(`[LOG] Patient created: ${patient.name} (ID: ${patient._id})`);

        return res.status(201).json({
            success: true,
            message: "Patient record created successfully.",
            data: patient
        });

    } catch (err) {
        console.error(`[ERROR] Failed to create patient: ${err.message}`);

        return res.status(500).json({
            success: false,
            error: "Server error during patient creation.",
            details: err.message
        });
    }
};


exports.getPatients = async (req, res, next) => {
    try {
        // Basic Query Object for filtering
        const query = {};

        // 1. Filtering by Name (Search feild from documentation)
        if (req.query.name) {
            // Case-insensitive regex search
            query.name = { $regex: req.query.name, $options: 'i' };
        }

        // Note: For Status filtering (Upcoming/Completed) and Date filtering (Today/Tomorrow), 
        // that logic requires separate endpoints or a complex aggregate, as followUps are nested arrays.
        // We stick to simple Patient List queries here.

        const patients = await Patient.find(query).sort({ consultationDate: -1 });

        console.log(`[LOG] Fetched ${patients.length} patient records.`);
        res.status(200).json({
            success: true,
            count: patients.length,
            data: patients
        });

    } catch (err) {
        console.error(`[ERROR] Failed to fetch patients: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error retrieving patients.', details: err.message });
    }
};

exports.getPatient = async (req, res, next) => {
    try {
        const { patientId } = req.body;

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({ success: false, error: `Patient with ID ${req.params.patientId} not found.` });
        }

        console.log(`[LOG] Fetched patient details for ID: ${req.params.patientId}`);
        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (err) {
        console.error(`[ERROR] Failed to fetch patient ${req.params.patientId}: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error retrieving patient details.', details: err.message });
    }
};

exports.updatePatient = async (req, res, next) => {
    try {

        const { patientId, ...updateData } = req.body;

        if (!patientId) {
            return res.status(400).json({ success: false, error: "patientId is required in body" });
        }

        const patient = await Patient.findByIdAndUpdate(
            patientId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!patient) {
            return res.status(404).json({ success: false, error: `Patient with ID ${patientId} not found.` });
        }

        console.log(`[LOG] Patient updated for ID: ${patientId}`);

        res.status(200).json({
            success: true,
            data: patient,
            message: 'Patient core information updated successfully.'
        });
    } catch (err) {
        console.error(`[ERROR] Failed to update patient ${req.params.patientId}: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error updating patient.', details: err.message });
    }
};

exports.deletePatient = async (req, res, next) => {
    try {
        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({ success: false, error: "patientId is required in body" });
        }

        const patient = await Patient.findByIdAndDelete(patientId);

        // --- OPTIONAL: Cloudinary Cleanup ---
        // If the patient record contains investigation files, you may want to delete them from Cloudinary
        if (patient.investigationFiles && patient.investigationFiles.length > 0) {
            const publicIds = patient.investigationFiles.map(file => file.publicId);
            // This is complex for multiple files, often handled by an external script or webhook.
            // For simplicity, we just log the action needed.
            console.log(`[NOTE] Patient had ${publicIds.length} files. Cloudinary cleanup needed for public IDs: ${publicIds.join(', ')}`);
        }

        console.log(`[LOG] Patient record deleted for ID: ${req.params.patientId}`);
        res.status(200).json({
            success: true,
            data: {},
            message: 'Patient record and all embedded data deleted successfully.'
        });
    } catch (err) {
        console.error(`[ERROR] Failed to delete patient ${req.params.patientId}: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error deleting patient.', details: err.message });
    }
};

exports.addTreatment = async (req, res, next) => {
    try {
        const { patientId, homoeopathy, diet, notes } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: "Patient ID is required in request body."
            });
        }

        if (!homoeopathy && !diet) {
            return res.status(400).json({
                success: false,
                error: "Please provide at least one treatment (homoeopathy or diet)."
            });
        }

        const newTreatment = {
            homoeopathy: homoeopathy || [],
            diet: diet || [],
            notes: notes || ""
        };

        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { $push: { treatments: newTreatment } },
            { new: true, runValidators: true }
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: `Patient with ID ${patientId} not found.`
            });
        }

        console.log(`[LOG] New treatment added to patient ID: ${patientId}`);

        res.status(200).json({
            success: true,
            message: "Treatment added successfully.",
            data: patient.treatments[patient.treatments.length - 1]
        });

    } catch (err) {
        console.error(`[ERROR] Failed to add treatment: ${err.message}`);
        res.status(500).json({
            success: false,
            error: "Server error adding treatment.",
            details: err.message
        });
    }
};

exports.editTreatment = async (req, res, next) => {
    try {
        const { homoeopathy, diet, notes, patientId, treatmentId } = req.body;

        console.log("========== EDIT TREATMENT DEBUG LOGS ==========");
        console.log("Incoming patientId:", patientId);
        console.log("Incoming treatmentId:", treatmentId);
        console.log("Incoming homoeopathy:", homoeopathy);
        console.log("Incoming diet:", diet);
        console.log("Incoming notes:", notes);

        if (!patientId || !treatmentId) {
            console.log("❌ Missing IDs");
            return res.status(400).json({
                success: false,
                error: "patientId and treatmentId are required."
            });
        }

        const updateFields = {};

        if (homoeopathy !== undefined)
            updateFields['treatments.$[element].homoeopathy'] = homoeopathy;

        if (diet !== undefined)
            updateFields['treatments.$[element].diet'] = diet;

        if (notes !== undefined)
            updateFields['treatments.$[element].notes'] = notes;

        console.log("\nUpdate fields to apply:", updateFields);

        console.log("\nRunning MongoDB update with arrayFilters:", {
            'element._id': treatmentId
        });

        const patient = await Patient.findOneAndUpdate(
            { _id: patientId },
            { $set: updateFields },
            {
                new: true,
                runValidators: true,
                arrayFilters: [{ 'element._id': treatmentId }],
                select: "treatments"
            }
        );

        console.log("\nMongoDB update result:", patient);

        if (!patient) {
            console.log("❌ Patient not found");
            return res.status(404).json({
                success: false,
                error: "Patient not found"
            });
        }

        const updatedTreatment = patient.treatments.find(
            t => t._id.toString() === treatmentId
        );

        if (!updatedTreatment) {
            console.log("❌ Treatment ID existed earlier but update did not trigger");
            console.log("Possible reason: arrayFilters not matching anything");
        }

        // Log homoeopathy for the matched treatment
        const treatment = patient.treatments.find(t => t._id.toString() === treatmentId);

        if (treatment) {
            console.log("\n📌 HOMOEOPATHY LOG (for treatmentId):", treatmentId);
            console.log(JSON.stringify(treatment.homoeopathy, null, 2));
        } else {
            console.log("\n❌ Treatment not found inside patient after update.");
        }

        console.log("========== END LOGS ==========\n");

        res.status(200).json({
            success: true,
            message: "Treatment updated successfully.",
            data: updatedTreatment
        });

    } catch (err) {
        console.error(`[ERROR] Failed to edit treatment: ${err.message}`);
        res.status(500).json({
            success: false,
            error: "Server error editing treatment.",
            details: err.message
        });
    }
};


exports.deleteTreatment = async (req, res, next) => {
    try {
        const { patientId, treatmentId } = req.params;

        // Use $pull to remove the embedded document by its ID
        const patient = await Patient.findByIdAndUpdate(
            patientId,
            {
                $pull: {
                    treatments: { _id: treatmentId }
                }
            },
            { new: true, select: 'treatments' } // Return the updated document
        );

        if (!patient) {
            return res.status(404).json({ success: false, error: `Patient with ID ${patientId} not found.` });
        }

        console.log(`[LOG] Treatment ID ${treatmentId} deleted from patient ID: ${patientId}`);
        res.status(200).json({
            success: true,
            data: {},
            message: 'Treatment deleted successfully.'
        });

    } catch (err) {
        console.error(`[ERROR] Failed to delete treatment: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error deleting treatment.', details: err.message });
    }
};

exports.uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded. Please include a file in the request.' });
        }

        const { originalname, buffer, mimetype } = req.file;
        const patientId = req.body.patientId;

        if (!patientId) {
            return res.status(400).json({ success: false, error: 'Please provide the patientId in the form data.' });
        }

        const isPdf = mimetype === 'application/pdf';
        const resourceType = isPdf ? 'raw' : 'image';
        const folder = `clinic_app/patient_reports/${patientId}`; // Organized storage

        // 1. Upload file to Cloudinary
        const result = await uploadStream(buffer, folder, resourceType);

        // 2. Prepare metadata for MongoDB
        const fileMetadata = {
            fileName: originalname,
            // Cloudinary's resource type dictates the URL we should save. 
            // If it's a PDF, we want the JPG generated by the 'transformation' for mobile preview, 
            // so we use the URL provided by Cloudinary.
            url: result.secure_url,
            publicId: result.public_id,
            mimeType: mimetype,
        };

        // 3. Save metadata to the Patient's investigationFiles array
        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { $push: { investigationFiles: fileMetadata } },
            { new: true, runValidators: true }
        );

        if (!patient) {
            // Attempt to delete file from Cloudinary if patient ID is invalid
            await cloudinary.uploader.destroy(result.public_id);
            return res.status(404).json({ success: false, error: `Patient with ID ${patientId} not found. File upload aborted.` });
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