const errorHandler = () => async (ctx, next) => {
  try {
    await next();

    // Respond 404 Not Found for unhandled request
    if (!ctx.body && (!ctx.status || ctx.status === 404)) {
      ctx.notFound();
    }
  } catch (err) {
    ctx.internalServerError({ name: err.name, message: err.message });

    // Recommended for centralized error reporting,
    // retaining the default behavior in Koa
    ctx.app.emit('error', err, ctx);
  }
};

module.exports = errorHandler;
