// Website Creator Configuration
// This file contains the hardcoded email for the website creator role

/**
 * The email address of the website creator.
 * This user has all permissions of MASTER_ADMIN and more.
 * Only this user should have the WEBSITE_CREATOR role.
 */
export const WEBSITE_CREATOR_EMAIL = "u21103000@sharjah.ac.ae";

/**
 * Check if a given email is the website creator
 */
export function isWebsiteCreator(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === WEBSITE_CREATOR_EMAIL.toLowerCase();
}

/**
 * Check if a user has elevated admin privileges (WEBSITE_CREATOR or MASTER_ADMIN)
 * These roles have access to all master admin features
 */
export function hasElevatedAdminPrivileges(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === "WEBSITE_CREATOR" || role === "MASTER_ADMIN";
}

/**
 * Check if a user is any type of admin (WEBSITE_CREATOR, MASTER_ADMIN, or ADMIN)
 */
export function isAnyAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === "WEBSITE_CREATOR" || role === "MASTER_ADMIN" || role === "ADMIN";
}
