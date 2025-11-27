const mongoose = require('mongoose');

// --- 1. Nested Schema for Medical Reports/Investigation Files ---
const InvestigationFileSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: [true, 'File name is required']
    },
    url: {
        type: String,
        required: [true, 'File URL is required (Cloudinary URL)']
    },
    publicId: { // Used for deleting/managing files on Cloudinary
        type: String,
        required: [true, 'Public ID is required']
    },
    mimeType: String, // e.g., application/pdf, image/jpeg
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

// --- 2. Nested Schema for Homoeopathy Treatment ---
const HomoeopathySchema = new mongoose.Schema({
    medicineName: {
        type: String,
        default: ''
    },
    potency: {
        type: String,
        default: ''
    },
    repetition: {
        type: String,
        default: ''
    },
    instructionMedicine: String, // Specific Instructions for Medicine
    instructionPatient: String,  // Specific Instructions for Patient
    addedAt: {
        type: Date,
        default: Date.now
    }
});

// --- 3. Nested Schema for Diet Consultation ---
const DietSchema = new mongoose.Schema({
    type: { // Options: Diet for Weight Loss, Diet for Weight Gain, Others
        type: String,
        default: ''
    },
    description: { // Text field to specify purpose if type is 'Others'
        type: String,
        default: ''
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

// --- 4. Nested Schema for a Single Treatment Record ---
const TreatmentSchema = new mongoose.Schema({
    homoeopathy: [HomoeopathySchema],
    diet: [DietSchema],
    notes: String,
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });   // <- IMPORTANT, no need for _id at treatment level


// --- 5. Nested Schema for Payments ---
const PaymentSchema = new mongoose.Schema({
    paymentMethod: {
        type: String,
        enum: ['Cash', 'UPI', 'Card', 'Other'],
        required: [true, 'Payment method is required.']
    },
    amount: {
        type: Number,
        required: [true, 'Payment amount is required.'],
        min: 0
    },
    billGenerationDate: { // Per documentation: "Total Bill Generation" implies this date
        type: Date,
        default: Date.now
    },
    notes: String
}, { _id: true });


// --- 6. Nested Schema for Follow-ups/Appointments ---
const FollowUpSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, 'Follow-up date is required.']
    },
    time: { // Store time as a string (e.g., "10:00 AM") or use a specialized type if necessary
        type: String,
        required: [true, 'Time slot is required.']
    },
    summary: String, // Short Description (consultation reason / treatment note)
    status: {
        type: String,
        enum: ['Upcoming', 'Completed', 'Pending'],
        default: 'Upcoming' // Default status when created
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });


// =================================================================
// --- 7. Main Patient Schema ---
// =================================================================
const PatientSchema = new mongoose.Schema({
    // --- Core Patient Data ---
    name: {
        type: String,
        required: [true, 'Patient name is required.'],
        trim: true
    },
    age: {
        type: Number,
        required: [true, 'Patient age is required.'],
        min: 0
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: [true, 'Patient gender is required.']
    },
    address: String,
    phoneNumber: {
        type: String,
        required: [true, 'Patient phone number is required.']
    },
    consultationDate: { // Date of Consultation (Doc)
        type: Date,
        required: [true, 'Date of initial consultation is required.']
    },

    // --- Embedded History Arrays ---
    investigationFiles: [InvestigationFileSchema], // A. Patient Data Management (Reports/Images)
    treatment: {
        type: TreatmentSchema,
        default: () => ({
            homoeopathy: [],
            diet: [],
            notes: ""
        })
    },             // B. Treatment Management (Homoeopathy + Diet)
    payments: [PaymentSchema],                   // C. Payment Module
    followUps: [FollowUpSchema],                 // 3. Appointment & Scheduling System

    // --- Audit/Metadata ---
    // createdBy: {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Patient', PatientSchema);