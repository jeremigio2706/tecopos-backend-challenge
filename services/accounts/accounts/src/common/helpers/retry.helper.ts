/**
 * Helper para implementar retry con exponential backoff
 */
export class RetryHelper {
  /**
   * Ejecuta una función con retry y exponential backoff
   * @param fn Función a ejecutar
   * @param maxAttempts Número máximo de intentos (default: 3)
   * @param delayMs Retraso inicial en ms (default: 1000)
   * @param backoffFactor Factor de multiplicación del retraso (default: 2)
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delayMs?: number;
      backoffFactor?: number;
      onRetry?: (attempt: number, error: unknown) => void;
    } = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delayMs = 1000,
      backoffFactor = 2,
      onRetry,
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          const delay = delayMs * Math.pow(backoffFactor, attempt - 1);

          if (onRetry) {
            onRetry(attempt, error);
          }

          console.log(
            `[Retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`,
          );

          await this.sleep(delay);
        }
      }
    }

    console.error(
      `[Retry] All ${maxAttempts} attempts failed. Throwing last error.`,
    );
    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
