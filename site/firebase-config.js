/* Cloud backup is OFF.
 *
 * The app installs to the home screen first, so there is no browser-to-app
 * handoff to solve and no reason to ask anyone for an account. Everything
 * stays on the device. Export from Settings is the backup.
 *
 * All sync code is gated on this value. Setting it back to a real config
 * restores sign-in, backup and restore exactly as they were — nothing was
 * deleted, only switched off.
 *
 * window.FIREBASE_CONFIG = {
 *   apiKey: "AIzaSyAeUL1DfK2hMisnP0SYpmVNnattUGskBVY",
 *   authDomain: "sadhana-tracker-app.netlify.app",
 *   projectId: "sadhana-app-ecdfa",
 *   storageBucket: "sadhana-app-ecdfa.firebasestorage.app",
 *   messagingSenderId: "500251547345",
 *   appId: "1:500251547345:web:a6608885068925c06857f0"
 * };
 */
window.FIREBASE_CONFIG = null;
