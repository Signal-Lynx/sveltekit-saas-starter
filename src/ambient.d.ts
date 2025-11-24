/**
 * Global types for the Account Update form result object.
 *
 * Notes:
 * - This file only declares types. It does not emit JavaScript.
 * - Keep `export {}` at the bottom so the file is treated as a module and
 *   doesn't pollute the global scope unintentionally beyond the explicit `declare global`.
 */

declare global {
  /**
   * The standardized payload returned by account update operations.
   * All properties are optional so the shape can represent partial successes/failures.
   *
   * Usage examples:
   *   const result: FormAccountUpdateResult = { errorMessage: "Email invalid", errorFields: ["email"] }
   *   const ok: FormAccountUpdateResult = { fullName: "Ada Lovelace", email: "ada@example.com" }
   */
  type FormAccountUpdateResult = {
    /**
     * A human-readable error summary suitable for toasts/alerts.
     * If present, the operation should be considered unsuccessful.
     */
    errorMessage?: string

    /**
     * A list of field names that failed validation.
     * Values are the names of the fields on this result object (e.g., "email").
     * (Kept as `string[]` for backward compatibility with existing code.)
     */
    errorFields?: string[]

    /** The user's full name after the attempted update (if available). */
    fullName?: string

    /** The company or organization name after the attempted update (if available). */
    companyName?: string

    /** The user's website URL after the attempted update (if available). */
    website?: string

    /** The user's email after the attempted update (if available). */
    email?: string
  }

  /**
   * Optional helper namespace for stronger typing elsewhere without changing
   * existing inputs/outputs. These types are additive and non-breaking.
   */
  namespace FormAccountUpdate {
    /** Strongly-typed set of known updatable field names. */
    type FieldName = "fullName" | "companyName" | "website" | "email"

    /** Convenience alias for the result type. */
    type Result = FormAccountUpdateResult

    /** If you need a readonly view of error field names. */
    type ReadonlyErrorFields = ReadonlyArray<FieldName>
  }
}

/** Keep this so the file is treated as a module (prevents global augmentation leaks). */
export {}
