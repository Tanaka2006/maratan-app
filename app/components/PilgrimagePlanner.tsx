"use client";

import { useState } from "react";
import Image from "next/image";
import WorkSelection from "./WorkSelection";
import PilgrimageMap from "./PilgrimageMap";
import TripConditions from "./TripConditions";
import CourseReview from "./CourseReview";
import { mockLocations } from "../data/mockLocations";
import type { TripConditionsInput } from "../types/trip";
import { mockSpots } from "../data/mockSpots";
import type { Work } from "../types/work";

type PilgrimagePlannerProps = {
  works: Work[];
};

export default function PilgrimagePlanner({ works }: PilgrimagePlannerProps) {
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const selectedWork = works.find((work) => work.id === selectedWorkId);
  const [screen, setScreen] = useState<"works" | "map" | "conditions" | "review">("works");
  const [conditionsByWork, setConditionsByWork] = useState<Record<string, TripConditionsInput>>({});
  // 作品ごとに保持し、別作品へ切り替えても選択を勝手に削除しません。
  const [spotIdsByWork, setSpotIdsByWork] = useState<Record<string, string[]>>({});
  const spots = mockSpots.filter((spot) => spot.workId === selectedWorkId);
  const selectedSpotIds = selectedWorkId ? (spotIdsByWork[selectedWorkId] ?? []) : [];
  const selectedSpots = spots.filter((spot) => selectedSpotIds.includes(spot.id));
  const conditions = selectedWorkId ? conditionsByWork[selectedWorkId] : undefined;
  // 同じ検証結果を、案内表示・ボタンの無効化・画面遷移のガードに使います。
  const conditionErrors: string[] = [];
  if (conditions) {
    if (!conditions.visitDate.trim()) conditionErrors.push("訪問日を入力してください。");
    if (!mockLocations.some((location) => location.id === conditions.startLocationId)) {
      conditionErrors.push("開始地点を選択してください。");
    }
    if (!mockLocations.some((location) => location.id === conditions.endLocationId)) {
      conditionErrors.push("終了地点を選択してください。");
    }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const validStart = timePattern.test(conditions.startTime);
    const validEnd = timePattern.test(conditions.endTime);
    if (!validStart) conditionErrors.push("開始時刻を正しく入力してください。");
    if (!validEnd) conditionErrors.push("終了時刻を正しく入力してください。");
    // HH:mm形式を確認済みなので、文字列比較でも同日内の前後を判定できます。
    if (validStart && validEnd && conditions.endTime <= conditions.startTime) {
      conditionErrors.push("終了時刻は、同日の開始時刻より後にしてください。");
    }
    for (const spot of selectedSpots) {
      const stay = conditions.stayMinutesBySpot[spot.id];
      if (!stay?.trim() || !Number.isFinite(Number(stay)) || Number(stay) <= 0) {
        conditionErrors.push(`${spot.name}の滞在時間に、0より大きい数を入力してください。`);
      }
    }
  }
  const canReview = Boolean(conditions) && conditionErrors.length === 0;

  function openConditions() {
    if (!selectedWorkId || selectedSpots.length < 1 || selectedSpots.length > 3) return;
    setConditionsByWork((current) => {
      const previous = current[selectedWorkId];
      const stayMinutesBySpot = { ...previous?.stayMinutesBySpot };
      for (const spot of selectedSpots) {
        // 追加した地点だけ初期化し、編集済み・編集中の入力は保持します。
        if (stayMinutesBySpot[spot.id] === undefined) {
          stayMinutesBySpot[spot.id] = String(spot.suggestedStayMinutes);
        }
      }
      const base = previous ?? {
        visitDate: "", startLocationId: mockLocations[0]?.id ?? "",
        endLocationId: mockLocations[0]?.id ?? "", startTime: "10:00", endTime: "17:00",
      };
      return { ...current, [selectedWorkId]: { ...base, stayMinutesBySpot } };
    });
    setScreen("conditions");
  }

  function toggleSpot(spotId: string) {
    if (!selectedWorkId || !spots.some((spot) => spot.id === spotId)) return;
    setSpotIdsByWork((current) => {
      const ids = current[selectedWorkId] ?? [];
      const next = ids.includes(spotId)
        ? ids.filter((id) => id !== spotId)
        : ids.length < 3 ? [...ids, spotId] : ids;
      return { ...current, [selectedWorkId]: next };
    });
  }

  return (
    <main lang="ja" className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex items-center gap-3 border-b border-line pb-4 sm:gap-4">
          <Image
            src="/machipo-logo.png"
            alt=""
            width={1105}
            height={879}
            sizes="(max-width: 640px) 48px, 56px"
            loading="eager"
            className="size-12 shrink-0 rounded-xl bg-white object-contain sm:size-14"
          />
          <div className="min-w-0">
            <p className="text-2xl font-extrabold leading-tight tracking-tight text-brand-ink sm:text-3xl">まちぽ</p>
            <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">好き。を体験に</p>
          </div>
        </header>
        {/* 非表示にしても①の検索入力を保持します。 */}
        <div hidden={screen !== "works"}>
        <WorkSelection works={works} selectedWorkId={selectedWorkId} onSelectWork={setSelectedWorkId} />
        <section aria-label="選択内容" className="mt-8 mp-card border-brand/25 bg-brand-soft">
          <p className="text-xs font-bold text-brand-ink">選択した作品</p>
          <div role="status" aria-atomic="true" className="mt-2">
            {selectedWork ? (
              <>
                <p className="text-lg font-bold">{selectedWork.name}</p>
                <p className="mt-1 text-sm text-muted">対応地域：{selectedWork.region}</p>
              </>
            ) : <p className="text-sm text-muted">一覧から作品を1つ選んでください。</p>}
          </div>
          <button type="button" disabled={!selectedWork} onClick={() => setScreen("map")} className="mp-button-primary mt-4 w-full">
            聖地マップへ進む →
          </button>
        </section>
        </div>
        {screen === "map" && selectedWork && (
          <>
            <PilgrimageMap work={selectedWork} spots={spots} selectedSpotIds={selectedSpotIds} onToggleSpot={toggleSpot} onBack={() => setScreen("works")} />
            <button type="button" disabled={selectedSpots.length < 1 || selectedSpots.length > 3} onClick={openConditions} className="mp-button-primary mt-6 w-full md:ml-auto md:block md:w-auto md:min-w-72">条件入力へ進む →</button>
          </>
        )}
        {screen === "conditions" && selectedWorkId && conditions && (
          <>
          <TripConditions conditions={conditions} locations={mockLocations} spots={selectedSpots} onBack={() => setScreen("map")} onChange={(next) => setConditionsByWork((current) => ({ ...current, [selectedWorkId]: next }))} />
          <div id="condition-errors" aria-live="polite" aria-atomic="true">
            {conditionErrors.length > 0 && (
              <div className="mp-notice mt-6">
                <p className="font-bold">コース確認へ進む前に、以下を確認してください。</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {conditionErrors.map((message) => <li key={message}>{message}</li>)}
                </ul>
              </div>
            )}
          </div>
          <button type="button" disabled={!canReview} aria-describedby={!canReview ? "condition-errors" : undefined} onClick={() => { if (canReview) setScreen("review"); }} className="mp-button-primary mt-6 w-full md:ml-auto md:block md:w-auto md:min-w-72">コース確認へ進む →</button>
          </>
        )}
        {screen === "review" && selectedWork && conditions && (
          <CourseReview work={selectedWork} spots={selectedSpots} conditions={conditions} locations={mockLocations} onBack={() => setScreen("conditions")} />
        )}
      </div>
    </main>
  );
}
