// auth.helpers.ts
import type { USERS } from "@database/database.types";
import type { UserClient } from "@user/user.types";

/**
 * Verifies a JWT token and returns the user payload
 * Optimized: comprehensive error handling
 */
export async function verifyToken(
  token: string,
  jwt: any
): Promise<UserClient | null> {
  try {
    if (!token) {
      return null;
    }

    return await jwt.verify(token);
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

/**
 * Creates a JWT token from user payload
 * Optimized: better error handling and validation
 */
export async function createToken(
  payload: UserClient,
  jwt: any
): Promise<string> {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }

  if (!payload || !payload.id) {
    throw new Error("Invalid payload for token creation");
  }

  try {
    return await jwt.sign(payload);
  } catch (error) {
    console.error("Token creation error:", error);
    throw new Error("Failed to create token");
  }
}

/**
 * Creates a secure cookie string for the token
 * Optimized: configurable maxAge and better documentation
 */
export function createSecureCookie(
  token: string,
  maxAge: number = 7200 // 2 hours default
): string {
  if (!token) {
    throw new Error("Token is required for cookie creation");
  }

  return `auth_token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}

/**
 * Creates an expired cookie to destroy the session
 * Optimized: consistent with createSecureCookie
 */
export function createExpiredCookie(): string {
  return "auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure";
}

/**
 * Maps a database User entity to a UserClient (removes sensitive data)
 * Optimized: validation and error handling
 */
export function mapToUserClient(user: USERS): UserClient {
  if (!user) {
    throw new Error("User is required for mapping");
  }

  if (!user.id || !user.username || !user.image_path) {
    throw new Error("Invalid user data: missing required fields");
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    avatar: user.image_path,
  };
}

/**
 * Maps business error messages to appropriate HTTP status codes
 * Optimized: updated for English error messages
 */
export function mapAuthErrorToStatus(error: string): number {
  switch (error) {
    case "Invalid credentials":
      return 401;
    case "Server configuration error":
      return 500;
    case "Required fields missing":
    case "Invalid data":
      return 400;
    case "Access denied":
      return 403;
    case "User not found":
      return 404;
    case "Too many attempts":
      return 429;
    case "Not authenticated":
      return 401; 
    case "Server error during login":
    case "Error during logout":
      return 500;
    default:
      return 500;
  }
}

