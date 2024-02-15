const errorHandler = () => async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // Handle validation errors.
    if (err.name === 'ValidationError') {
      ctx.badRequest({ name: err.name, message: err.message });
    } else {
      throw err;
    }
  }
};

module.exports = errorHandler;
