
export const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (err) {

            console.error(err);
            if (res && typeof res.status === 'function') {
                return res.status(500).json({ error: 'Internal server error' });
            }
            return next ? next(err) : undefined;
        }
    };
};

export default asyncHandler;
