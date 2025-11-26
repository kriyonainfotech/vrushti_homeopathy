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

exports.addTreatment = async (req, res) => {
    try {
        const { patientId, homoeopathy, diet, notes } = req.body;

        if (!patientId) {
            return res.status(400).json({ success: false, error: "patientId is required" });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, error: "Patient not found" });
        }

        // Ensure treatment exists
        if (!patient.treatment) {
            patient.treatment = { homoeopathy: [], diet: [], notes: "" };
        }

        // Add homoeopathy items
        if (homoeopathy) {
            const items = Array.isArray(homoeopathy) ? homoeopathy : [homoeopathy];
            patient.treatment.homoeopathy.push(...items);
        }

        // Add diet items
        if (diet) {
            const items = Array.isArray(diet) ? diet : [diet];
            patient.treatment.diet.push(...items);
        }

        // Update notes
        if (notes !== undefined) {
            patient.treatment.notes = notes;
        }

        await patient.save();

        return res.status(200).json({
            success: true,
            message: "Treatment updated successfully",
            data: patient.treatment
        });

    } catch (err) {
        console.error("[ERROR] addTreatment:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

exports.editTreatment = async (req, res) => {
    try {
        const { patientId, itemId, homoeopathy, diet, notes } = req.body;

        if (!patientId) {
            return res.status(400).json({ success: false, error: "patientId is required" });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, error: "Patient not found" });
        }

        const treatment = patient.treatment;
        if (!treatment) {
            return res.status(404).json({ success: false, error: "This patient has no treatment yet" });
        }

        // ---------------------------------
        // Update notes
        // ---------------------------------
        if (notes !== undefined) {
            treatment.notes = notes;
        }

        // ---------------------------------
        // Update/Add homoeopathy item
        // ---------------------------------
        if (homoeopathy && Array.isArray(homoeopathy) && homoeopathy.length > 0) {
            const data = homoeopathy[0];

            if (itemId) {
                const existing = treatment.homoeopathy.id(itemId);
                if (existing) {
                    Object.assign(existing, data);
                } else {
                    treatment.homoeopathy.push(data);
                }
            } else {
                treatment.homoeopathy.push(data);
            }
        }

        // ---------------------------------
        // Update/Add diet item
        // ---------------------------------
        if (diet && Array.isArray(diet) && diet.length > 0) {
            const data = diet[0];

            if (itemId) {
                const existing = treatment.diet.id(itemId);
                if (existing) {
                    Object.assign(existing, data);
                } else {
                    treatment.diet.push(data);
                }
            } else {
                treatment.diet.push(data);
            }
        }

        await patient.save();

        return res.status(200).json({
            success: true,
            message: "Item updated successfully",
            data: treatment
        });

    } catch (err) {
        console.error("[ERROR] editTreatment:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};


exports.deleteTreatment = async (req, res) => {
    try {
        const { patientId, itemId } = req.body;

        if (!patientId || !itemId) {
            return res.status(400).json({ success: false, error: "patientId and itemId are required" });
        }

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ success: false, error: "Patient not found" });
        }

        const treatment = patient.treatment; // NOW this is a single object
        if (!treatment) {
            return res.status(404).json({ success: false, error: "No treatment recorded" });
        }

        let removed = false;

        // Delete from homoeopathy
        const homeoItem = treatment.homoeopathy.id(itemId);
        if (homeoItem) {
            treatment.homoeopathy.pull(itemId);
            removed = true;
        }

        // Delete from diet
        const dietItem = treatment.diet.id(itemId);
        if (dietItem) {
            treatment.diet.pull(itemId);
            removed = true;
        }

        if (!removed) {
            return res.status(404).json({ success: false, error: "Item not found" });
        }

        await patient.save();

        return res.status(200).json({
            success: true,
            message: "Item deleted successfully",
            data: treatment
        });

    } catch (err) {
        console.error("[ERROR] deleteTreatment:", err);
        return res.status(500).json({ success: false, error: err.message });
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