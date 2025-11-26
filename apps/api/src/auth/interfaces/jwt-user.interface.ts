/**
 * JWT User Interface
 *
 * Represents the user payload extracted from JWT tokens.
 * Used with the @CurrentUser() decorator to get authenticated user info.
 */
export interface JwtUser {
  /**
   * User's UUID from the database
   */
  user_id: string;

  /**
   * User's email address
   */
  email: string;
}
