const jwt = require('jsonwebtoken');

// Generates a JWT and attaches it to the response as a cookie
const generateToken = (res, userId, role) => {
    const token = jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN // e.g., '30d'
    });

    // Set cookie options
    const cookieOptions = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000), // e.g., 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only secure in production
        sameSite: 'strict',
    };

    // Attach token to the response cookie
    res.cookie('token', token, cookieOptions);

    return token;
};

module.exports = generateToken;