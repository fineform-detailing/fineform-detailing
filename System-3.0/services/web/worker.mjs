// Internal web service. Public access and security headers belong to the API gateway.
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
