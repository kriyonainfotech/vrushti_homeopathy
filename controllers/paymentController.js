const Patient = require('../models/PatientModel');
const mongoose = require('mongoose');

// @desc    Add a new Payment Record to a Patient
// @route   POST /api/v1/patients/:patientId/payments
// @access  Protected (Staff/Admin)
exports.addPayment = async (req, res, next) => {
    try {
        const {patientId, paymentMethod, amount, notes } = req.body;
        console.log(req.body,'req.body');

        // Basic Validation
        if (!paymentMethod || !amount) {
            return res.status(400).json({ success: false, error: 'Payment method and amount are required.' });
        }
        if (typeof amount !== 'number' || amount < 0) {
            return res.status(400).json({ success: false, error: 'Amount must be a non-negative number.' });
        }

        const newPayment = {
            paymentMethod,
            amount,
            notes: notes || '',
            // The billGenerationDate (default: Date.now) is automatically set by the schema
        };

        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { $push: { payments: newPayment } },
            { new: true, runValidators: true, select: 'payments name' }
        );

        if (!patient) {
            return res.status(404).json({ success: false, error: `Patient with ID ${patientId} not found.` });
        }

        const addedPayment = patient.payments[patient.payments.length - 1];

        console.log(`[LOG] Payment of ${amount} added for Patient ${patient.name} via ${paymentMethod}.`);
        res.status(201).json({
            success: true,
            data: addedPayment,
            message: 'Payment recorded successfully.'
        });

    } catch (err) {
        console.log(`[ERROR] Failed to add payment: ${err}`);
        res.status(500).json({ success: false, error: 'Server error recording payment.', details: err.message });
    }
};

// @desc    Delete a specific Payment Record from a Patient's history
// @route   DELETE /api/v1/patients/:patientId/payments/:paymentId
// @access  Protected (Staff/Admin)
exports.deletePayment = async (req, res, next) => {
    try {
        const { patientId, paymentId } = req.body;

        // Use $pull to remove the embedded payment document by its ID
        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { 
                $pull: { 
                    payments: { _id: paymentId } 
                } 
            },
            { new: true, select: 'payments name' }
        );

        if (!patient) {
            return res.status(404).json({ success: false, error: `Patient with ID ${patientId} not found.` });
        }
        
        // Note: MongoDB will only remove the payment if the paymentId matches.
        // If the payment was already deleted or never existed, patient will still be returned.

        console.log(`[LOG] Payment record ${paymentId} deleted from patient ID: ${patientId}.`);
        res.status(200).json({
            success: true,
            data: {},
            message: 'Payment record deleted successfully.'
        });

    } catch (err) {
        console.error(`[ERROR] Failed to delete payment: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error deleting payment.', details: err.message });
    }
};

exports.getPatientPayments = async (req, res) => {
    try {
        console.log(req.body, "get all-------------------------");

        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: "patientId is required in the request body."
            });
        }

        const patient = await Patient.findById(patientId).select('name payments');

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: `Patient with ID ${patientId} not found.`
            });
        }

        return res.status(200).json({
            success: true,
            patientName: patient.name,
            count: patient.payments.length,
            data: patient.payments
        });

    } catch (err) {
        console.error(`[ERROR] Failed to fetch patient payments: ${err.message}`);
        return res.status(500).json({
            success: false,
            error: 'Server error retrieving payments.',
            details: err.message
        });
    }
};
