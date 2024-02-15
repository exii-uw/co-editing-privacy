module.exports = store => async (ctx, next) => {
  // Inject the store.
  ctx.store = store;

  // Close the store at the end of the request.
  // Await (and not return) to make sure it returns undefined.
  await next();
};
