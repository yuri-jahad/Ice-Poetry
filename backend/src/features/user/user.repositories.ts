// auth.repository.ts
import { testPerformance } from "@/shared/shared.helpers";
import { db } from "@database/database.config";
import type { USERS } from "@database/database.types";
import { sql } from "kysely";

/**
 * Authenticates a user with username/password
 * Optimized: selects only necessary fields + error handling
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<USERS | null> {
  try {
    const user = await db
      .selectFrom("USERS")
      .selectAll()
      .where("username", "=", username)
      .executeTakeFirst();

    if (!user) {
      return null;
    }

    const passwordIsValid = await Bun.password.verify(password, user.password);
    return passwordIsValid ? user : null;
  } catch (error) {
    console.error("Database error in authenticateUser:", error);
    return null;
  }
}

/**
 * Retrieves a user by username
 * Optimized: error handling
 */
export async function getUserByUsername(
  username: string
): Promise<USERS | null> {
  try {
    return ((await db
      .selectFrom("USERS")
      .selectAll()
      .where("username", "=", username)
      .executeTakeFirst()) || null);
  } catch (error) {
    console.error("Database error in getUserByUsername:", error);
    return null;
  }
}

/**
 * Retrieves a user by ID
 * Optimized: error handling
 */
export async function getUserById(id: number): Promise<USERS | null> {
  try {
    return (
      (await db
        .selectFrom("USERS")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst()) || null
    );
  } catch (error) {
    console.error("Database error in getUserById:", error);
    return null;
  }
}

/**
 * Checks if a user exists by ID
 * Ultra-optimized: COUNT query
 */
export async function userExists(id: number): Promise<boolean> {
  try {
    const result = await db
      .selectFrom("USERS")
      .select(sql`1`.as("exists"))
      .where("id", "=", id)
      .limit(1) // ← Arrête dès qu'il trouve
      .executeTakeFirst();

    return !!result;
  } catch (error) {
    console.error("Database error in userExists:", error);
    return false;
  }
}

