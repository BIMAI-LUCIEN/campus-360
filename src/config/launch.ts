// V1 launch: every paid action is free so students can try the whole app.
// The server is the source of truth (account.wallet.freeLaunch, FREE_LAUNCH_MODE env);
// this default only covers the moment before the account is loaded.
let freeLaunch = true;

export const isFreeLaunch = (): boolean => freeLaunch;

export const setFreeLaunch = (value: boolean): void => {
  freeLaunch = value;
};

export const FREE_LABEL = 'Gratuit';
