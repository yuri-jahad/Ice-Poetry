export const authMiddleware = async ({ cookie, jwt }: any) => {
  const token = cookie.auth_token.value;
  if (!token) {
    return { isAuthenticated: false, user: null };
  }
  
  const payload = await jwt.verify(token);
  if (!payload) {
    return { isAuthenticated: false, user: null };
  }

  return { isAuthenticated: true, user: payload };
};
