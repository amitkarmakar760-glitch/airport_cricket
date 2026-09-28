// Central app constants. If you change ADMIN_CODE, change it in firestore.rules too
// (search for '732101' there) so the server-side check matches.
export const ADMIN_CODE = '732101';
export const MAX_ADMINS = 3;
// Booking/tea-stall history streamed to each phone (keeps Firebase reads low).
export const HISTORY_DAYS = 60;
