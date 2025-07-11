import type { UserClient } from '@user/user.types';
import type { JWTPayload } from '@shared/shared.types';

export async function testPerformance(
  asyncFunction: () => Promise<any>,
  iterations: number = 1,
  label: string = "Test"
): Promise<void> {
  console.log(`🚀 Starting performance test: ${label}`);
  console.log(`📊 Iterations: ${iterations}`);
  console.log("─".repeat(50));

  const times: number[] = [];
  let totalTime = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();

    try {
      await asyncFunction();
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      times.push(executionTime);
      totalTime += executionTime;

      console.log(`⏱️  Run ${i + 1}: ${executionTime.toFixed(2)}ms`);
    } catch (error) {
      console.error(`❌ Error in run ${i + 1}:`, error);
    }
  }

  // Calculs statistiques
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log("─".repeat(50));
  console.log(`📈 Results for ${label}:`);
  console.log(`   Average: ${avgTime.toFixed(2)}ms`);
  console.log(`   Minimum: ${minTime.toFixed(2)}ms`);
  console.log(`   Maximum: ${maxTime.toFixed(2)}ms`);
  console.log(`   Total:   ${totalTime.toFixed(2)}ms`);
  console.log("═".repeat(50));
}


export async function createToken(user: UserClient, jwt: any): Promise<string> {
  const payload: JWTPayload = {
    username: user.username,
    role: user.role,
    avatar:user.avatar,
    id: user.id
  };

  return jwt.sign(payload, {
    exp: "2h", // Expiration dans 2 heures
  });
}


/**
 * Validates if a string is a valid JWT format
 * Optimized: additional utility for token validation
 */
export function isValidJWTFormat (token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  // JWT has 3 parts separated by dots
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

/**
 * Sanitizes user input by trimming whitespace
 * Optimized: utility for input validation
 */
export function sanitizeInput (input: string): string {
  return input?.trim() || ''
}

export function shuffle<T> (array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}


