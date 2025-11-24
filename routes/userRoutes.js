const express = require("express");
const router = express.Router();
const { register, login, forgotPassword, resetPassword } = require('../controllers/userController')

router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword', resetPassword);

// Example protected route (just for testing middleware)
// This now relies on the 'user-id' header being passed by the client after login
// router.get('/me', protect, (req, res) => {
//     res.status(200).json({
//         success: true,
//         data: {
//             id: req.user._id,
//             name: req.user.name,
//             email: req.user.email,
//             role: req.user.role,
//             message: 'This route is protected.'
//         }
//     });
// });


module.exports = router;
