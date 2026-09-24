import type { TripLocation } from "../types/trip";

// 現在のダミー地域専用。先頭を初期の開始・終了地点に使用。
export const mockLocations: TripLocation[] = [
  { id: "mock-main-station", name: "ダミー中央駅（架空・主要駅）" },
  { id: "mock-east-station", name: "ダミー東駅（架空）" },
];
