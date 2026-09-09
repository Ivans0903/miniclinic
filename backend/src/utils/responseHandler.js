// Standar response seragam untuk seluruh endpoint
exports.sendSuccess = (res, message, data = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message: message,
        data: data
    });
};

exports.sendError = (res, message, errors = {}, statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        message: message,
        errors: errors
    });
};
