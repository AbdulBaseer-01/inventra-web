const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
    const bearerToken = req.headers.authorization?.split(" ")[1];
    const cookieToken = req.cookies?.accessToken;
    const token = bearerToken || cookieToken;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
};
