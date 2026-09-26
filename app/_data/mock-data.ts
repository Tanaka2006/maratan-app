export type Work = {
  id: string;
  title: string;
  type: "アニメ" | "ドラマ" | "映画";
  region: string;
  area: string;
  description: string;
  available: boolean;
  color: string;
};

export type Spot = {
  id: string;
  name: string;
  shortName: string;
  relation: string;
  stayMinutes: number;
  hours: string;
  lastEntry: string;
  fee: number | null;
  reservation: string;
  officialUrl: string;
  sourceLabel: string;
  sourceDate: string;
  caution: string;
  mapX: number;
  mapY: number;
};

export type Detour = {
  id: string;
  name: string;
  category: "食べる" | "買う" | "体験する";
  description: string;
  reason: string;
  stayMinutes: number;
  price: number | null;
  priceLabel: string;
  hours: string;
  reservation: string;
};

export const works: Work[] = [
  {
    id: "umimachi",
    title: "海街スケッチ",
    type: "アニメ",
    region: "神奈川県",
    area: "鎌倉・由比ヶ浜エリア",
    description: "海辺の町で過ごす四季を描いた物語",
    available: true,
    color: "#f8c2a0",
  },
  {
    id: "kitaguni",
    title: "北国フィルムノート",
    type: "ドラマ",
    region: "北海道",
    area: "小樽エリア",
    description: "古い港町を舞台にした青春ドラマ",
    available: false,
    color: "#cbdfe6",
  },
  {
    id: "kazemachi",
    title: "風待ち郵便局",
    type: "映画",
    region: "愛媛県",
    area: "松山エリア",
    description: "坂の町の小さな郵便局を巡る物語",
    available: false,
    color: "#d8d3b0",
  },
];

export const spots: Spot[] = [
  {
    id: "crossing",
    name: "海辺の踏切",
    shortName: "踏切",
    relation: "第3話で主人公が海を眺めた場面のモデル地",
    stayMinutes: 20,
    hours: "屋外地点（営業時間なし）",
    lastEntry: "なし",
    fee: 0,
    reservation: "不要",
    officialUrl: "https://example.com/demo-source/crossing",
    sourceLabel: "市観光案内（デモ）",
    sourceDate: "2026年9月12日",
    caution: "生活道路です。立ち止まらず、線路内へ入らないでください。",
    mapX: 28,
    mapY: 62,
  },
  {
    id: "viewpoint",
    name: "潮風の丘 展望台",
    shortName: "展望台",
    relation: "キービジュアルの背景に描かれた高台のモデル地",
    stayMinutes: 30,
    hours: "9:00〜17:00",
    lastEntry: "16:30",
    fee: 300,
    reservation: "不要",
    officialUrl: "https://example.com/demo-source/viewpoint",
    sourceLabel: "施設公式（デモ）",
    sourceDate: "2026年9月10日",
    caution: "雨天時は足元が滑りやすくなります。三脚の使用は禁止です。",
    mapX: 67,
    mapY: 25,
  },
  {
    id: "clocktower",
    name: "旧市街の時計塔",
    shortName: "時計塔",
    relation: "主人公たちの待ち合わせ場所として登場した建物",
    stayMinutes: 25,
    hours: "10:00〜16:30（水曜休館）",
    lastEntry: "16:00",
    fee: 200,
    reservation: "不要",
    officialUrl: "https://example.com/demo-source/clocktower",
    sourceLabel: "施設公式（デモ）",
    sourceDate: "2026年9月8日",
    caution: "館内の一部は撮影できません。現地の案内に従ってください。",
    mapX: 59,
    mapY: 52,
  },
  {
    id: "stone-steps",
    name: "あじさい路地の石段",
    shortName: "石段",
    relation: "最終話で手紙を渡す場面に使われた坂道のモデル地",
    stayMinutes: 15,
    hours: "屋外地点（営業時間なし）",
    lastEntry: "なし",
    fee: 0,
    reservation: "不要",
    officialUrl: "https://example.com/demo-source/stone-steps",
    sourceLabel: "ロケ地マップ（デモ）",
    sourceDate: "2026年9月5日",
    caution: "住宅地です。大声や長時間の撮影は控えてください。",
    mapX: 78,
    mapY: 69,
  },
];

export const detours: Detour[] = [
  {
    id: "shirasu",
    name: "浜風しらす食堂",
    category: "食べる",
    description: "地元で水揚げされたしらすを使う小さな食堂",
    reason: "海辺の踏切から駅へ戻る途中にあり、昼食に立ち寄りやすい",
    stayMinutes: 45,
    price: 1400,
    priceLabel: "参考 1,400円〜",
    hours: "11:00〜15:00（売切れ次第終了）",
    reservation: "予約不可・当日営業を要確認",
  },
  {
    id: "craft",
    name: "鎌倉紋様工房",
    category: "体験する",
    description: "地域の意匠を使った小物づくりを体験できる工房",
    reason: "時計塔から徒歩圏内。雨の日でも過ごしやすい",
    stayMinutes: 50,
    price: 2200,
    priceLabel: "体験 2,200円",
    hours: "10:00〜17:00（木曜休み）",
    reservation: "前日までの予約推奨",
  },
  {
    id: "market",
    name: "よりみち朝市",
    category: "買う",
    description: "地元野菜と焼き菓子が並ぶ週末の小さな市場",
    reason: "鎌倉駅に近く、コースの最後に地域の商品を選べる",
    stayMinutes: 25,
    price: null,
    priceLabel: "購入内容により異なる",
    hours: "土日 9:00〜14:00",
    reservation: "不要",
  },
];

export const stations = ["鎌倉駅 東口", "由比ヶ浜駅", "長谷駅"];
