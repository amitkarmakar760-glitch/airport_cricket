// Central app constants. If you change ADMIN_CODE, change it in firestore.rules too
// (search for '732101' there) so the server-side check matches.
export const ADMIN_CODE = '732101';
export const MAX_ADMINS = 3;
// Booking/tea-stall history streamed to each phone (keeps Firebase reads low).
export const HISTORY_DAYS = 60;
// Any uploaded best-shot video is trimmed *in the player* (not re-encoded) to this
// many seconds, then loops. Admins can pick a video of any length.
export const BEST_SHOT_CLIP_SECONDS = 3;
// Share button sends this link when no custom link is saved in Admin -> Match -> Invite link.
// The GitHub Actions workflow publishes every new APK here, so the link never changes.
export const DEFAULT_SHARE_URL = 'https://github.com/amitkarmakar760-glitch/airport_cricket/releases/latest/download/airport-cricket.apk';
