const Patient = require('../models/PatientModel');

exports.addFollowUp = async (req, res, next) => {
    try {
        const { patientId, date, time, summary } = req.body;

        if (!patientId || !date || !time) {
            return res.status(400).json({ success: false, error: 'patientId, follow-up date and time are required.' });
        }

        const newFollowUp = {
            date: new Date(date),
            time,
            summary: summary || '',
            status: 'Upcoming'
        };

        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { $push: { followUps: newFollowUp } },
            { new: true, runValidators: true, select: 'followUps name' }
        );

        if (!patient) return res.status(404).json({ success: false, error: `Patient not found.` });

        const addedFollowUp = patient.followUps[patient.followUps.length - 1];

        res.status(200).json({
            success: true,
            data: addedFollowUp,
            message: 'Follow-up added successfully.'
        });

    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error adding follow-up.', details: err.message });
    }
};


exports.updateFollowUpStatus = async (req, res, next) => {
    try {
        const { patientId, followupId, status } = req.body;

        if (!patientId || !followupId || !status || !['Completed', 'Pending'].includes(status)) {
            return res.status(400).json({ success: false, error: 'patientId, followupId and valid status are required.' });
        }

        const patient = await Patient.findOneAndUpdate(
            { _id: patientId, 'followUps._id': followupId },
            { $set: { 'followUps.$.status': status } },
            { new: true, select: 'followUps name' }
        );

        if (!patient) return res.status(404).json({ success: false, error: `Patient or Follow-up not found.` });

        const updatedFollowUp = patient.followUps.find(f => f._id.toString() === followupId);

        res.status(200).json({
            success: true,
            data: updatedFollowUp,
            message: `Follow-up marked as ${status}.`
        });

    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error updating follow-up status.', details: err.message });
    }
};


exports.getAppointmentsList = async (req, res, next) => {
    try {
        const { date, status, name } = req.query;

        const pipeline = [];

        // 1. Deconstruct the 'followUps' array to process each follow-up as a separate document
        pipeline.push({ $unwind: '$followUps' });

        // 2. Project/Shape the output for easy consumption
        pipeline.push({ 
            $project: {
                _id: 0, // Exclude patient _id
                patientId: '$_id',
                patientName: '$name',
                appointmentId: '$followUps._id',
                date: '$followUps.date',
                time: '$followUps.time',
                summary: '$followUps.summary',
                status: '$followUps.status',
                consultationDate: '$consultationDate' // Initial consultation date
            } 
        });

        // 3. Filtering Logic (A. Date Filters & Sorting)
        if (date || status || name) {
            const match = {};

            // Filter by Status (Completed / Pending / Upcoming)
            if (status) {
                match.status = status;
            }

            // Filter by Patient Name (Search feild)
            if (name) {
                // Case-insensitive regex search on the projected patientName field
                match.patientName = { $regex: name, $options: 'i' };
            }

            // Filter by Date (Today / Tomorrow / Select Date)
            if (date) {
                const queryDate = new Date(date);
                // Set the start of the day (e.g., 2025-11-27 00:00:00.000Z)
                const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());
                // Set the end of the day (e.g., 2025-11-27 23:59:59.999Z)
                const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate() + 1, 0, 0, 0, -1);
                
                match.date = { 
                    $gte: startOfDay, 
                    $lte: endOfDay 
                };
                
                console.log(`[LOG] Filtering appointments from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
            }

            if (Object.keys(match).length > 0) {
                 pipeline.push({ $match: match });
            }
        }

        // 4. Sorting (Sort by date ascending)
        pipeline.push({ $sort: { date: 1, time: 1 } });

        // Execute the aggregation pipeline
        const appointments = await Patient.aggregate(pipeline);

        console.log(`[LOG] Appointments list retrieved with ${appointments.length} results.`);
        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });

    } catch (err) {
        console.error(`[ERROR] Failed to fetch appointments list: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error retrieving appointments list.', details: err.message });
    }
};

exports.deleteFollowUp = async (req, res, next) => {
    try {
        const { patientId, followupId } = req.body;

        if (!patientId || !followupId) {
            return res.status(400).json({ success: false, error: 'patientId and followupId are required.' });
        }

        const patient = await Patient.findByIdAndUpdate(
            patientId,
            { $pull: { followUps: { _id: followupId } } },
            { new: true, select: 'followUps name' }
        );

        if (!patient) return res.status(404).json({ success: false, error: `Patient not found.` });

        res.status(200).json({
            success: true,
            message: 'Follow-up deleted successfully.',
            data: {}
        });

    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error deleting follow-up.', details: err.message });
    }
};

exports.getPatientFollowUps = async (req, res, next) => {
    try {
        const { patientId } = req.body;
        if (!patientId) return res.status(400).json({ success: false, error: 'patientId is required.' });

        const patient = await Patient.findById(patientId, 'followUps name');
        if (!patient) return res.status(404).json({ success: false, error: `Patient not found.` });

        res.status(200).json({
            success: true,
            data: patient.followUps
        });

    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error fetching follow-ups.', details: err.message });
    }
};
