"use client";

import { useEffect, useState } from "react";
import type { ResearchWork } from "../_data/research-works";
import type { ResearchSpot } from "../_data/research-spots";
import { displayVersion } from "../_data/work-genres";

const MAX_STOPS = 3;

function placeQuery(spot: ResearchSpot) {
  return `${spot.region.replace("・", " ")} ${spot.name}`;
}

function placeUrl(spot: ResearchSpot) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: placeQuery(spot) })}`;
}

function directionsUrl(from: ResearchSpot, to: ResearchSpot) {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: placeQuery(from), destination: placeQuery(to) })}`;
}

function routeUrl(stops: ResearchSpot[]) {
  const params = new URLSearchParams({ api: "1", origin: placeQuery(stops[0]), destination: placeQuery(stops[stops.length - 1]) });
  if (stops.length > 2) params.set("waypoints", stops.slice(1, -1).map(placeQuery).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

function spotNotes(spot: ResearchSpot) {
  const notes: string[] = [];
  if (spot.granularity !== "地点") notes.push(`${spot.granularity}単位の候補です。正確な場所は出典で確認してください。`);
  if (spot.sourceStage.startsWith("推しワク")) notes.push("紹介サイトの掲載情報です。現地の状況は未確認です。");
  else if (spot.sourceStage !== "本文記載確認") notes.push("掲載情報を確認中の地点です。");
  return notes;
}

function SpotLinks({ spot }: { spot: ResearchSpot }) {
  return <div className="spot-links">
    <a href={placeUrl(spot)} target="_blank" rel="noreferrer">Googleマップで場所を見る ↗</a>
    <a href={spot.sourceUrl} target="_blank" rel="noreferrer">出典 ↗</a>
    {spot.listingUrl ? <a href={spot.listingUrl} target="_blank" rel="noreferrer">推しワク掲載ページ ↗</a> : null}
  </div>;
}

export default function ResearchCourse({ work, region, onBack }: { work: ResearchWork; region: string; onBack: () => void }) {
  const [spots, setSpots] = useState<ResearchSpot[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const version = displayVersion(work.version);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/research-spots?workId=${encodeURIComponent(work.id)}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("地点を取得できませんでした。");
      const data = await response.json();
      const matching = (Array.isArray(data.spots) ? data.spots : []).filter((spot: ResearchSpot) => spot.region === region);
      setSpots(matching);
      setSelectedIds(matching.slice(0, MAX_STOPS).map((spot: ResearchSpot) => spot.id));
      setError("");
      setLoading(false);
    }).catch(() => { if (!controller.signal.aborted) { setError("地点を取得できませんでした。通信状況を確認して、もう一度お試しください。"); setLoading(false); } });
    return () => controller.abort();
  }, [work.id, region, attempt]);

  function toggleSpot(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < MAX_STOPS ? [...current, id] : current);
  }

  function moveSpot(id: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  const ordered = selectedIds.map((id) => spots.find((spot) => spot.id === id)).filter((spot): spot is ResearchSpot => Boolean(spot));
  const single = spots.length === 1 ? spots[0] : null;

  return <section className="screen-section research-course-screen">
    <button className="text-back" type="button" onClick={onBack}>← 作品一覧へ戻る</button>
    <div className="section-heading"><div>
      <p className="page-kicker"><span>{region}</span>{version ? <span>{version}</span> : null}</p>
      <h1>{work.title}</h1>
      <p>{single ? "この地域で掲載している地点です。" : `この地域の掲載地点は${spots.length || work.region_counts[region] || ""}件です。巡りたい地点を選ぶと、訪問順の案を作れます。`}</p>
    </div></div>

    {loading ? <p className="loading-note" role="status">地点を読み込んでいます…</p> : null}
    {error ? <div className="inline-error" role="alert"><p>{error}</p><button className="text-button" type="button" onClick={() => { setError(""); setLoading(true); setAttempt((value) => value + 1); }}>再読み込み</button></div> : null}

    {!loading && !error && single ? <article className="research-single">
      <h2>{single.name}</h2>
      {spotNotes(single).map((note) => <p className="research-source-warning" key={note}>{note}</p>)}
      <SpotLinks spot={single} />
    </article> : null}

    {!loading && !error && spots.length > 1 ? <div className="research-course-layout">
      <section aria-labelledby="choose-heading">
        <h2 id="choose-heading">巡る地点を選ぶ <small>{selectedIds.length}／最大{MAX_STOPS}件</small></h2>
        <div className="research-course-grid">{spots.map((spot) => {
          const checked = selectedIds.includes(spot.id);
          const disabled = !checked && selectedIds.length >= MAX_STOPS;
          return <article className={`research-course-spot${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`} key={spot.id}>
            <label><input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSpot(spot.id)} /><span><strong>{spot.name}</strong>{spotNotes(spot).map((note) => <small key={note}>{note}</small>)}</span></label>
            <SpotLinks spot={spot} />
          </article>;
        })}</div>
        {selectedIds.length >= MAX_STOPS ? <p className="field-hint">一度に巡れるのは{MAX_STOPS}件までです。入れ替えるときは、選択中の地点のチェックを外してください。</p> : null}
      </section>

      <section className="research-course-result" aria-labelledby="plan-heading" aria-live="polite">
        <h2 id="plan-heading">訪問順の案</h2>
        {ordered.length ? <>
          <ol>{ordered.map((spot, index) => <li key={spot.id}>
            <div className="plan-stop">
              <span className="stop-number" aria-hidden="true">{index + 1}</span>
              <strong>{spot.name}</strong>
              {ordered.length > 1 ? <div className="order-buttons">
                <button type="button" onClick={() => moveSpot(spot.id, -1)} disabled={index === 0} aria-label={`${spot.name}を一つ前へ`}>↑</button>
                <button type="button" onClick={() => moveSpot(spot.id, 1)} disabled={index === ordered.length - 1} aria-label={`${spot.name}を一つ後へ`}>↓</button>
              </div> : null}
            </div>
            {ordered[index + 1] ? <a className="plan-leg" href={directionsUrl(spot, ordered[index + 1])} target="_blank" rel="noreferrer">次の地点までの経路をGoogleマップで見る ↗</a> : null}
          </li>)}</ol>
          {ordered.length > 1 ? <a className="primary-button" href={routeUrl(ordered)} target="_blank" rel="noreferrer">この順番でGoogleマップを開く ↗</a> : null}
          <p className="field-hint">↑↓で順番を入れ替えられます。移動時間と営業状況は判定していないため、Googleマップで訪問日時を指定して確認してください。</p>
        </> : <p className="field-hint">巡りたい地点にチェックを入れてください。</p>}
      </section>
    </div> : null}

    {!loading && !error ? <p className="caution-note"><strong>出発前に</strong>正確な位置・営業状況・立入の可否は公式情報で確認してください。学校・住宅地・施設の敷地には許可なく入らないでください。</p> : null}
  </section>;
}
