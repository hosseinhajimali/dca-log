// Local / single-user mode.
// When LOCAL_MODE=true the app skips login entirely: the server auto-issues a
// JWT for one shared local user, so every user-scoped endpoint (including
// backup export/import) keeps working unchanged. Set LOCAL_MODE=false (or unset)
// to require real login (email/password or Google OAuth) for multi-user hosting.
export const LOCAL_MODE = process.env.LOCAL_MODE === 'true';

// The fixed account used in local mode. Not a real email, never receives mail.
export const LOCAL_USER_EMAIL = 'local@dcalog.local';
