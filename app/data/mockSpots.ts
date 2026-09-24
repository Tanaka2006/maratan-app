import type { Spot } from "../types/spot";

// 全地点・作品との関係・滞在時間・注意事項は操作確認用の架空データです。
// 根拠となる実在ページはないため、URLを捏造せず null とします。
export const mockSpots: Spot[] = [
  { id: "a-1", workId: "demo-a", name: "ダミー地点A1・駅前広場", relationship: "ダミー作品Aの待ち合わせ場面を想定した架空の地点です。", suggestedStayMinutes: 15, notes: "通行の妨げにならないようにする、という注意表示のサンプルです。", sourceUrl: null },
  { id: "a-2", workId: "demo-a", name: "ダミー地点A2・坂道", relationship: "ダミー作品Aの通学場面を想定した架空の地点です。", suggestedStayMinutes: 20, notes: "歩行時の足元に注意する、という注意表示のサンプルです。", sourceUrl: null },
  { id: "a-3", workId: "demo-a", name: "ダミー地点A3・公園", relationship: "ダミー作品Aの休憩場面を想定した架空の地点です。", suggestedStayMinutes: 30, notes: "現地の利用案内を確認する、という注意表示のサンプルです。", sourceUrl: null },
  { id: "a-4", workId: "demo-a", name: "ダミー地点A4・橋", relationship: "ダミー作品Aの風景場面を想定した架空の地点です。", suggestedStayMinutes: 10, notes: "立ち止まる場所に注意する、という注意表示のサンプルです。", sourceUrl: null },
  { id: "b-1", workId: "demo-b", name: "ダミー地点B1・商店街", relationship: "ダミー作品Bの買い物場面を想定した架空の地点です。", suggestedStayMinutes: 20, notes: "撮影前に施設の案内を確認する、という注意表示のサンプルです。", sourceUrl: null },
  { id: "b-2", workId: "demo-b", name: "ダミー地点B2・遊歩道", relationship: "ダミー作品Bの散歩場面を想定した架空の地点です。", suggestedStayMinutes: 25, notes: "通行可能な範囲を確認する、という注意表示のサンプルです。", sourceUrl: null },
];
