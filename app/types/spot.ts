// 作品ごとの聖地表示用データ。DBのテーブル構成とは独立しています。
export type Spot = {
  id: string;
  workId: string;
  name: string;
  relationship: string;
  suggestedStayMinutes: number;
  notes: string;
  sourceUrl: string | null;
};
