const express = require('express');
const router = express.Router();

const {
    createPatient,
    getPatients,
    addTreatment,
    editTreatment,
    deleteTreatment, getPatient,
    updatePatient,
    deletePatient,
    getAllPatientPayments
} = require('../controllers/patientController');
const multer = require('multer');
const { getAppointmentsList, updateFollowUpStatus, deleteFollowUp, getPatientFollowUps, addFollowUp } = require('../controllers/appointmentsController');
const { getPatientPayments, addPayment, deletePayment } = require('../controllers/paymentController');

const { uploadFile, deleteFile } = require('../controllers/FileController');


// --- Multer Setup: Use memory storage for stream upload to Cloudinary ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// All routes below are protected (require 'User-ID' header)
// router.use(protect); // Applies 'protect' middleware to all routes in this router

// [ ] API: POST /patient (Add Patient)
router.post('/create', createPatient);

// [ ] API: GET /patients (List all patients)
router.get('/get-all', getPatients);

router.post("/getbyId", getPatient);

router.put("/update", updatePatient);

router.delete("/delete", deletePatient);

// [ ] API: POST /patient/:id/treatment
router.post('/treatment/add', addTreatment);

router.put('/treatments/edit', editTreatment);

router.delete('/treatments/:treatmentId', deleteTreatment);

// POST /files/upload - Handles file upload using multer middleware
router.post('/files/upload', upload.single('file'), uploadFile); 

// DELETE /files/:patientId/delete/:fileId - Delete file from Cloudinary and DB
router.delete('/files/delete', deleteFile);

// GET /followup/list - Get all follow-ups from all patients
router.get('/followup/list', getAppointmentsList);

// POST /followup/add - Add a new follow-up for a patient
router.post('/followup/add', addFollowUp);

// PUT /followup/status - Update follow-up status (Completed/Pending)
router.put('/followup/status', updateFollowUpStatus);

// DELETE /followup/delete - Delete a follow-up
router.delete('/followup/delete', deleteFollowUp);

// GET /followup/patient - Get all follow-ups for a single patient
router.post('/followup/patientId', getPatientFollowUps); // now uses body: { patientId }

// ==========================================================
// PAYMENT MODULE (C. Payment Module) - NEW ROUTES
// ==========================================================
// GET /patients/:patientId/payments - List all payments for a patient
router.post('/payments/bypatientId', getPatientPayments); 
// POST /patients/:patientId/payments - Add a new payment record
router.post('/payments/add', addPayment); 
// DELETE /patients/:patientId/payments/:paymentId - Delete a payment record
router.delete('/payments/delete', deletePayment);

router.get('/payments/all', getAllPatientPayments);

module.exports = router;