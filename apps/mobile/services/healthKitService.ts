export type WearableStatus = { connected: boolean; label: string };

export async function getWearableStatus(): Promise<WearableStatus> { return { connected: true, label: "Apple Health / Health Connect" }; }
export async function requestHealthPermissions() { return true; }
