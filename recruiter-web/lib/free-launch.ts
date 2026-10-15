// V1 launch: every paid action is free so students can try the whole app.
// Switch back to paid mode by setting FREE_LAUNCH_MODE=false (no code change needed).
export const isFreeLaunch = (): boolean => process.env.FREE_LAUNCH_MODE !== 'false';
