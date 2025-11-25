const express = require("express");
const router = express.Router();

router.use('/auth', require('./userRoutes'));
router.use('/patients', require('./patientRoutes'));

module.exports = router;
