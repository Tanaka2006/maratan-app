export type TripLocation = {
  id: string;
  name: string;
};

// 日付・時刻は日本時間の入力値をそのまま保持（UTC変換しない）。
export type TripConditionsInput = {
  visitDate: string;
  startLocationId: string;
  endLocationId: string;
  startTime: string;
  endTime: string;
  // 編集途中の空欄も保持できるよう、分数は入力文字列で管理。
  stayMinutesBySpot: Record<string, string>;
};
