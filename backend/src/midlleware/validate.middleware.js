module.exports = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query
    });

    if (!result.success) {
        console.warn("Request validation failed:", result.error.issues);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: result.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data.body || req.body;
    req.params = result.data.params || req.params;
    req.query = result.data.query || req.query;

    next();
};
