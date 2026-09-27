import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryFromTypes, closedWeekdaysFromPeriods, extractJson, isWithinReach, matchGroundedPicks, normalizePlaceId,
  openingHoursTextFor, safeDetourText, safeMapsUri, slotLabel, suggestSlot,
} from "../app/_data/local-detours.ts";

// 飛騨古川付近の聖地（座標は概略）
const library = { id: "p_library", name: "飛騨市図書館", latitude: 36.2381, longitude: 137.1866 };
const station = { id: "p_station", name: "飛騨古川駅", latitude: 36.2372, longitude: 137.1895 };
const shrine = { id: "p_shrine", name: "気多若宮神社", latitude: 36.2425, longitude: 137.1830 };

test("Place ID は places/ 付きでも素のIDでも受け付け、不正な文字列は捨てる", () => {
  assert.equal(normalizePlaceId("places/ChIJN1t_tDeuEmsRUsoyG83frY4"), "ChIJN1t_tDeuEmsRUsoyG83frY4");
  assert.equal(normalizePlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4"), "ChIJN1t_tDeuEmsRUsoyG83frY4");
  assert.equal(normalizePlaceId("../../etc/passwd"), null);
  assert.equal(normalizePlaceId("short"), null);
  assert.equal(normalizePlaceId(42), null);
});

test("カテゴリは Places API の種別から決める", () => {
  assert.equal(categoryFromTypes("japanese_restaurant"), "food");
  assert.equal(categoryFromTypes("confectionery"), "food");
  assert.equal(categoryFromTypes("museum"), "culture");
  assert.equal(categoryFromTypes("gift_shop"), "shopping");
  assert.equal(categoryFromTypes(null, ["point_of_interest", "art_studio"]), "culture");
  assert.equal(categoryFromTypes("liquor_store"), "shopping");
});

test("営業時間から、1日も開かない曜日だけを休業日にする", () => {
  const periods = [1, 2, 3, 4, 5, 6].map((day) => ({ open: { day, hour: 10 }, close: { day, hour: 17 } }));
  assert.deepEqual(closedWeekdaysFromPeriods(periods), [0]);
  assert.deepEqual(closedWeekdaysFromPeriods([{ open: { day: 0, hour: 0, minute: 0 } }]), [], "24時間営業");
  assert.deepEqual(closedWeekdaysFromPeriods([]), [], "営業時間不明は休業扱いしない");
  assert.deepEqual(closedWeekdaysFromPeriods(undefined), []);
});

test("訪問日の曜日に対応する営業時間の行を返す（Googleは月曜始まり）", () => {
  const lines = ["月曜日: 10時00分～17時00分", "火曜日: 定休日", "水曜日: x", "木曜日: x", "金曜日: x", "土曜日: x", "日曜日: 9時00分～15時00分"];
  assert.equal(openingHoursTextFor(lines, "2026-09-27"), lines[6]); // 日曜
  assert.equal(openingHoursTextFor(lines, "2026-09-28"), lines[0]); // 月曜
  assert.equal(openingHoursTextFor(lines.slice(0, 3), "2026-09-28"), null);
});

test("聖地から離れすぎた場所は寄り道にしない", () => {
  assert.equal(isWithinReach({ latitude: 36.2390, longitude: 137.1880 }, [library, station]), true);
  assert.equal(isWithinReach({ latitude: 36.1461, longitude: 137.2522 }, [library, station]), false, "高山駅付近は約11km離れている");
});

test("聖地の間にある場所は「間」、外れた場所は最寄り聖地の「前後」と提案する", () => {
  const between = suggestSlot({ latitude: 36.2377, longitude: 137.1881 }, [library, station, shrine]);
  assert.deepEqual(between, { kind: "between", fromId: "p_library", toId: "p_station" });
  const outside = suggestSlot({ latitude: 36.2330, longitude: 137.1990 }, [library, shrine]);
  assert.equal(outside.kind, "near");
  const names = { p_library: "飛騨市図書館", p_station: "飛騨古川駅" };
  assert.match(slotLabel(between, names), /「飛騨市図書館」と「飛騨古川駅」の間/);
  assert.equal(suggestSlot({ latitude: 36.2, longitude: 137.1 }, [library]).kind, "near");
});

test("Gemini の応答からコードフェンス付きでも JSON を取り出す", () => {
  assert.deepEqual(extractJson('```json\n[{"name":"a"}]\n```'), [{ name: "a" }]);
  assert.deepEqual(extractJson('候補です。[{"name":"b"}] 以上'), [{ name: "b" }]);
  assert.equal(extractJson("見つかりませんでした"), null);
});

test("営業・価格・作品との関係を断定する紹介文は使わない", () => {
  assert.equal(safeDetourText("飛騨牛や朴葉味噌など飛騨の郷土料理を味わえる"), "飛騨牛や朴葉味噌など飛騨の郷土料理を味わえる");
  assert.equal(safeDetourText("今なら営業中で予約不要"), null);
  assert.equal(safeDetourText("ランチは1,200円"), null);
  assert.equal(safeDetourText("作品に登場したお店"), null);
  assert.equal(safeDetourText("a".repeat(200)), null);
});

test("Googleマップの根拠に含まれない店はAIの創作とみなして捨てる", () => {
  const grounded = [
    { placeId: "ChIJaaaaaaaaaaaaaaaa", title: "三嶋和ろうそく店", uri: "https://maps.google.com/?cid=1" },
    { placeId: "ChIJbbbbbbbbbbbbbbbb", title: "蕪水亭", uri: "https://maps.google.com/?cid=2" },
  ];
  const raw = [
    { name: "三嶋 和ろうそく店", localFeature: "飛騨古川の伝統の和ろうそく", reason: "図書館から歩いて寄れる伝統工芸の店" },
    { name: "架空の郷土料理店", localFeature: "郷土料理", reason: "おいしい" },
    { name: "蕪水亭", placeId: "places/ChIJbbbbbbbbbbbbbbbb", localFeature: "飛騨の郷土料理", reason: "駅に近く食事に寄りやすい" },
    { name: "蕪水亭", localFeature: "重複", reason: "重複" },
  ];
  const picks = matchGroundedPicks(raw, grounded);
  assert.deepEqual(picks.map((pick) => pick.placeId), ["ChIJaaaaaaaaaaaaaaaa", "ChIJbbbbbbbbbbbbbbbb"]);
  assert.equal(picks[0].name, "三嶋和ろうそく店", "表示名はGoogleマップ上の名称を使う");
  assert.equal(picks[1].mapsUri, "https://maps.google.com/?cid=2");
});

test("Googleマップ以外へのリンクは表示しない", () => {
  assert.equal(safeMapsUri("https://maps.google.com/?cid=123"), "https://maps.google.com/?cid=123");
  assert.equal(safeMapsUri("https://evil.example.com/maps"), null);
  assert.equal(safeMapsUri("javascript:alert(1)"), null);
});
