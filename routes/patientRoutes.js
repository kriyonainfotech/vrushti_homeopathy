const express = require('express');
const {
    createPatient,
    getPatients,
    addTreatment,
    uploadFile,
    editTreatment,
    deleteTreatment, getPatient,
    updatePatient,
    deletePatient
} = require('../controllers/patientController');
const multer = require('multer');
const { getAppointmentsList, updateFollowUpStatus, deleteFollowUp, getPatientFollowUps, addFollowUp } = require('../controllers/appointmentsController');

const router = express.Router();

// --- Multer Setup ---
// Use memory storage for Multer, which is required for stream uploads to Cloudinary
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

router.post('/upload', upload.single('file'), uploadFile);

// --- Follow-up Routes (IDs in body) ---

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


module.exports = router;