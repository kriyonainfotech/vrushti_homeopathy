const express = require("express");
const router = express.Router();
const { register, login, forgotPassword, resetPassword, updateUserDetails } = require('../controllers/userController')

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);
router.put('/updateprofile',updateUserDetails)

module.exports = router;
