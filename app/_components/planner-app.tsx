"use client";

import Image from "next/image";
import { useState } from "react";
import { detours, spots, stations, works, type Detour, type Spot } from "../_data/mock-data";

type Step = 1 | 2 | 3 | 4;
type Conditions = {
  date: string;
  startPoint: string;
  endPoint: string;
  startTime: string;
  endTime: string;
  durations: Record<string, number>;
};
type ItineraryItem = {
  id: string;
  name: string;
  type: "start" | "sacred" | "detour" | "end";
  stayMinutes: number;
  note: string;
};
type IconName = "arrow" | "back" | "calendar" | "check" | "chevron" | "clock" | "external" | "info" | "map" | "pin" | "plus" | "search" | "sparkles" | "train" | "walk" | "warning" | "x";

const STEP_LABELS = ["作品・地域", "聖地を選ぶ", "条件を入力", "コース確認"];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3z" /><path d="M8 3v15M16 6v15" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sparkles: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z" /><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" /></>,
    train: <><rect x="5" y="3" width="14" height="15" rx="3" /><path d="M8 21l2-3h4l2 3M8 7h8M8 12h.01M16 12h.01" /></>,
    walk: <><circle cx="13" cy="4" r="2" /><path d="m10 22 2-7-3-3 2-5 4 3 3 1M12 15l4 2 2 5M7 22l2-5" /></>,
    warning: <><path d="M10.3 3.7 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}時間${minutes ? `${minutes}分` : ""}` : `${minutes}分`;
}

function addMinutes(time: string, addition: number) {
  const value = minutesFromTime(time) + addition;
  return `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function mapsUrl(origin: string, destination: string, mode: "walking" | "transit") {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin, destination, travelmode: mode }).toString()}`;
}

function AppHeader({ onReset }: { onReset: () => void }) {
  return (
    <header className="app-header">
      <button className="brand" onClick={onReset} aria-label="めぐりっぷ ホームへ戻る">
        <span className="brand-mark"><Image src="/app-icon.png" alt="" width={548} height={494} priority /></span>
        <span><strong>めぐりっぷ</strong><small>物語の場所から、まちを歩こう。</small></span>
      </button>
      <div className="demo-badge"><span /> デモ版</div>
    </header>
  );
}

function Stepper({ step, goTo }: { step: Step; goTo: (next: Step) => void }) {
  return (
    <nav className="stepper" aria-label="コース作成の進み具合">
      {STEP_LABELS.map((label, index) => {
        const itemStep = (index + 1) as Step;
        const complete = step > itemStep;
        return (
          <button key={label} type="button" className={`step-item ${step === itemStep ? "is-active" : ""} ${complete ? "is-complete" : ""}`} onClick={() => itemStep < step && goTo(itemStep)} disabled={itemStep > step} aria-current={step === itemStep ? "step" : undefined}>
            <span className="step-number">{complete ? <Icon name="check" size={16} /> : itemStep}</span><span className="step-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Intro({ search, setSearch, onNext }: { search: string; setSearch: (value: string) => void; onNext: () => void }) {
  const visibleWorks = works.filter((work) => `${work.title}${work.region}${work.area}`.includes(search.trim()));
  return (
    <section className="screen-section intro-section">
      <div className="eyebrow"><Icon name="sparkles" size={16} /> COURSE PLANNER</div>
      <h1>あの物語の場所から、<br /><em>まちの魅力</em>へ。</h1>
      <p className="lead">行きたい聖地と現地で使える時間を選ぶだけ。作品の舞台と、その土地ならではの寄り道をつなぐコースをご提案します。</p>
      <div className="search-panel">
        <label htmlFor="work-search">作品名や地域から探す</label>
        <div className="search-field"><Icon name="search" /><input id="work-search" type="search" placeholder="例：海街スケッチ、鎌倉" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      <div className="section-heading compact-heading"><div><span className="section-kicker">対応中の作品</span><h2>どの物語をめぐりますか？</h2></div><span className="result-count">{visibleWorks.filter((work) => work.available).length}作品</span></div>
      <div className="work-grid">
        {visibleWorks.map((work) => (
          <article className={`work-card ${work.available ? "featured" : "is-disabled"}`} key={work.id}>
            <div className="work-visual" style={{ "--work-color": work.color } as React.CSSProperties}><div className="sun-shape" /><div className="rail-line" /><span className="work-type">{work.type}</span>{!work.available ? <span className="coming-soon">公開準備中</span> : null}</div>
            <div className="work-body"><div className="work-location"><Icon name="pin" size={15} /> {work.region}・{work.area}</div><h3>{work.title}</h3><p>{work.description}</p><button className="select-work" type="button" disabled={!work.available} onClick={onNext}>{work.available ? "この作品でコースを作る" : "対応エリアを準備しています"}{work.available ? <Icon name="arrow" size={18} /> : null}</button></div>
          </article>
        ))}
      </div>
      <div className="scope-note"><Icon name="info" size={18} /><p><strong>掲載されていない作品・地域について</strong><br />出典と現地での利用可能性を確認できた場所から順次公開します。未対応の場所を自動生成することはありません。</p></div>
    </section>
  );
}

function SpotMap({ selected, onToggle }: { selected: string[]; onToggle: (spot: Spot) => void }) {
  return (
    <div className="mock-map" aria-label="聖地の位置を示すデモ地図">
      <div className="map-water"><span>相模湾</span></div><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-rail" />
      <div className="station-label"><Icon name="train" size={14} /> 鎌倉駅</div>
      {spots.map((spot, index) => {
        const active = selected.includes(spot.id);
        return <button key={spot.id} type="button" className={`map-pin ${active ? "is-selected" : ""}`} style={{ left: `${spot.mapX}%`, top: `${spot.mapY}%` }} onClick={() => onToggle(spot)} aria-label={`${spot.name}${active ? "の選択を外す" : "を選ぶ"}`}><span>{active ? <Icon name="check" size={15} /> : index + 1}</span><b>{spot.shortName}</b></button>;
      })}
      <div className="map-legend"><span><i className="legend-pin sacred" /> 聖地</span><span><i className="legend-pin station" /> 駅</span></div><span className="map-demo-label">デモ地図</span>
    </div>
  );
}

function SpotSelection({ selected, onToggle, onNext, onBack }: { selected: string[]; onToggle: (spot: Spot) => void; onNext: () => void; onBack: () => void }) {
  return (
    <section className="screen-section">
      <button className="text-back" type="button" onClick={onBack}><Icon name="back" size={18} /> 作品を選び直す</button>
      <div className="section-heading"><div><span className="section-kicker">STEP 02</span><h1>行きたい聖地を選ぶ</h1><p>必ず訪れたい場所を1〜3件選んでください。選んだ場所はコースから外しません。</p></div><div className={`selection-counter ${selected.length ? "has-selection" : ""}`}><strong>{selected.length}</strong><span>/ 3件<br />選択中</span></div></div>
      <div className="map-card"><SpotMap selected={selected} onToggle={onToggle} /></div>
      <div className="spot-list">
        {spots.map((spot, index) => {
          const active = selected.includes(spot.id);
          return (
            <article className={`spot-card ${active ? "is-selected" : ""}`} key={spot.id}>
              <button className="spot-select-area" type="button" onClick={() => onToggle(spot)} aria-pressed={active}><span className="spot-index">{active ? <Icon name="check" size={16} /> : index + 1}</span><span className="spot-main"><span className="spot-kind">作品の聖地</span><strong>{spot.name}</strong><small>{spot.relation}</small></span><span className="spot-choice">{active ? "選択済み" : "選ぶ"}</span></button>
              <div className="spot-meta"><span><Icon name="clock" size={15} /> 滞在目安 {spot.stayMinutes}分</span><span>{spot.hours}</span><span>最終入場 {spot.lastEntry}</span><span>{spot.fee === null ? "料金不明" : spot.fee === 0 ? "無料" : `入場料 ${spot.fee}円`}</span><span>予約：{spot.reservation}</span></div>
              <div className="spot-detail-row"><p><Icon name="warning" size={15} /> {spot.caution}</p><a href={spot.officialUrl} target="_blank" rel="noreferrer">{spot.sourceLabel}・確認 {spot.sourceDate} <Icon name="external" size={13} /></a></div>
            </article>
          );
        })}
      </div>
      <div className="sticky-action"><div><strong>{selected.length ? `${selected.length}件の聖地を選択中` : "聖地を選んでください"}</strong><span>{selected.length >= 3 ? "選択上限です" : "あとから戻って変更できます"}</span></div><button className="primary-button" type="button" disabled={!selected.length} onClick={onNext}>条件入力へ <Icon name="arrow" size={19} /></button></div>
    </section>
  );
}

function ConditionsForm({ conditions, setConditions, selectedSpots, onNext, onBack }: { conditions: Conditions; setConditions: React.Dispatch<React.SetStateAction<Conditions>>; selectedSpots: Spot[]; onNext: () => void; onBack: () => void }) {
  const available = minutesFromTime(conditions.endTime) - minutesFromTime(conditions.startTime);
  const valid = conditions.date && available > 60;
  const update = (key: keyof Omit<Conditions, "durations">, value: string) => setConditions((current) => ({ ...current, [key]: value }));
  return (
    <section className="screen-section narrow-section">
      <button className="text-back" type="button" onClick={onBack}><Icon name="back" size={18} /> 聖地選択へ戻る</button>
      <div className="section-heading"><div><span className="section-kicker">STEP 03</span><h1>現地で使える時間を教えてください</h1><p>ここで指定するのは現地での開始から終了までです。自宅からの往復は含みません。</p></div></div>
      <div className="form-card">
        <div className="form-section"><div className="form-section-title"><span>1</span><div><h2>訪問日</h2><p>営業日と経路の検索条件に使用します</p></div></div><label className="input-label" htmlFor="visit-date">訪問日 <b>必須</b></label><div className="input-with-icon"><Icon name="calendar" /><input id="visit-date" type="date" value={conditions.date} min="2026-09-26" onChange={(event) => update("date", event.target.value)} /></div><p className="input-hint">日本時間で計算します。臨時休業や当日の運行状況は別途ご確認ください。</p></div>
        <div className="form-section"><div className="form-section-title"><span>2</span><div><h2>開始・終了地点</h2><p>現地の駅・地点から選択してください</p></div></div><div className="two-column-fields"><label className="input-label">開始地点 <b>必須</b><select value={conditions.startPoint} onChange={(event) => update("startPoint", event.target.value)}>{stations.map((station) => <option key={station}>{station}</option>)}</select></label><label className="input-label">終了地点 <b>必須</b><select value={conditions.endPoint} onChange={(event) => update("endPoint", event.target.value)}>{stations.map((station) => <option key={station}>{station}</option>)}</select></label></div></div>
        <div className="form-section"><div className="form-section-title"><span>3</span><div><h2>希望する時間</h2><p>コースが収まるかを概算します</p></div></div><div className="time-range"><label className="input-label">開始時刻 <b>必須</b><input type="time" value={conditions.startTime} onChange={(event) => update("startTime", event.target.value)} /></label><span className="time-line" /><label className="input-label">終了希望時刻 <b>必須</b><input type="time" value={conditions.endTime} onChange={(event) => update("endTime", event.target.value)} /></label></div><div className={`available-time ${available <= 60 ? "is-error" : ""}`}><Icon name="clock" /><span>現地で使える時間</span><strong>{available > 0 ? formatMinutes(available) : "時刻を確認してください"}</strong></div></div>
        <div className="form-section last-form-section"><div className="form-section-title"><span>4</span><div><h2>聖地での滞在時間</h2><p>初期値から自由に変更できます</p></div></div><div className="duration-list">{selectedSpots.map((spot) => <label key={spot.id}><span><i>聖地</i><strong>{spot.name}</strong></span><span className="number-input"><input type="number" min="10" max="180" step="5" value={conditions.durations[spot.id] ?? spot.stayMinutes} onChange={(event) => setConditions((current) => ({ ...current, durations: { ...current.durations, [spot.id]: Number(event.target.value) } }))} /><em>分</em></span></label>)}</div><p className="input-hint">入力した滞在時間をアプリが勝手に短縮することはありません。</p></div>
      </div>
      <div className="estimate-note"><Icon name="info" size={19} /><p><strong>表示される時刻はすべて目安です</strong><br />経路検索の結果は便・運行状況により変わります。コース作成後、各区間をGoogleマップで確認してください。</p></div>
      <div className="bottom-actions"><button className="secondary-button" type="button" onClick={onBack}><Icon name="back" size={18} /> 戻る</button><button className="primary-button" type="button" disabled={!valid} onClick={onNext}>コースを作る <Icon name="sparkles" size={19} /></button></div>
    </section>
  );
}

function CourseResult({ selectedSpots, selectedDetours, toggleDetour, conditions, onBack }: { selectedSpots: Spot[]; selectedDetours: string[]; toggleDetour: (detour: Detour) => void; conditions: Conditions; onBack: () => void }) {
  const activeDetours = detours.filter((detour) => selectedDetours.includes(detour.id));
  const itinerary = (() => {
    const items: ItineraryItem[] = [{ id: "start", name: conditions.startPoint, type: "start", stayMinutes: 0, note: "集合・出発" }];
    selectedSpots.forEach((spot, index) => {
      items.push({ id: spot.id, name: spot.name, type: "sacred", stayMinutes: conditions.durations[spot.id] ?? spot.stayMinutes, note: spot.relation });
      if (index === 0) activeDetours.filter((item) => item.id === "shirasu").forEach((item) => items.push({ id: item.id, name: item.name, type: "detour", stayMinutes: item.stayMinutes, note: item.reason }));
      if (index === selectedSpots.length - 1) activeDetours.filter((item) => item.id !== "shirasu").forEach((item) => items.push({ id: item.id, name: item.name, type: "detour", stayMinutes: item.stayMinutes, note: item.reason }));
    });
    items.push({ id: "end", name: conditions.endPoint, type: "end", stayMinutes: 0, note: "コース終了" });
    return items;
  })();
  const legs = itinerary.slice(0, -1).map((item, index) => ({ from: item.name, to: itinerary[index + 1].name, minutes: 8 + ((index * 5 + itinerary.length) % 9), mode: index === 0 && itinerary.length > 4 ? "transit" as const : "walking" as const, distance: `${650 + index * 230}m` }));
  const stayTotal = itinerary.reduce((total, item) => total + item.stayMinutes, 0);
  const moveTotal = legs.reduce((total, leg) => total + leg.minutes, 0);
  const buffer = 20;
  const total = stayTotal + moveTotal + buffer;
  const available = minutesFromTime(conditions.endTime) - minutesFromTime(conditions.startTime);
  const difference = available - total;
  const status = difference >= 30 ? "目安では収まる" : difference >= 0 ? "要確認" : "目安でも収まらない";
  const statusClass = difference >= 30 ? "good" : difference >= 0 ? "caution" : "over";
  const facilityCost = selectedSpots.reduce((sum, spot) => sum + (spot.fee ?? 0), 0);
  const detourCost = activeDetours.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const transitCost = legs.some((leg) => leg.mode === "transit") ? 180 : 0;
  let elapsed = 0;
  return (
    <section className="screen-section result-section">
      <button className="text-back" type="button" onClick={onBack}><Icon name="back" size={18} /> 条件を変更する</button>
      <div className="result-hero"><div className="result-title"><span className="section-kicker">YOUR COURSE</span><h1>海と物語をたどる<br />鎌倉まち歩きコース</h1><p><Icon name="calendar" size={17} /> {conditions.date.replaceAll("-", ".")}　{conditions.startTime} — {conditions.endTime}</p></div><div className={`judgement-card ${statusClass}`}><span><Icon name={statusClass === "good" ? "check" : "warning"} size={18} /> コース判定</span><strong>{status}</strong><p>{difference >= 0 ? `希望時間まで約${difference}分の余裕があります` : `希望時間を約${Math.abs(difference)}分超える見込みです`}</p></div></div>
      <div className="summary-strip"><div><span>総所要時間の目安</span><strong>{formatMinutes(total)}</strong></div><div><span>スポット</span><strong>{selectedSpots.length + activeDetours.length}<small>件</small></strong></div><div><span>移動</span><strong>{formatMinutes(moveTotal)}</strong></div><div><span>終了目安</span><strong>{addMinutes(conditions.startTime, total)}</strong></div></div>
      <div className="result-layout"><div className="course-column"><div className="content-heading"><div><span className="section-kicker">ITINERARY</span><h2>訪問順と区間</h2></div><span className="recalculated"><Icon name="check" size={14} /> 再計算済み</span></div><div className="timeline">
        {itinerary.map((item, index) => { const arrivalTime = addMinutes(conditions.startTime, elapsed); const leg = legs[index]; elapsed += item.stayMinutes + (leg?.minutes ?? 0); return <div className="timeline-group" key={item.id}><article className={`timeline-stop ${item.type}`}><div className="timeline-time">{arrivalTime}</div><div className="timeline-dot">{item.type === "sacred" ? <Icon name="sparkles" size={16} /> : item.type === "detour" ? <Icon name="plus" size={16} /> : <Icon name="pin" size={16} />}</div><div className="timeline-content"><span className="stop-type">{item.type === "sacred" ? "作品の聖地・必須" : item.type === "detour" ? "地域の寄り道" : item.type === "start" ? "スタート" : "ゴール"}</span><h3>{item.name}</h3><p>{item.note}</p>{item.stayMinutes ? <span className="stay-time"><Icon name="clock" size={14} /> 滞在 {item.stayMinutes}分</span> : null}</div></article>{leg ? <div className="timeline-leg"><span className="leg-line" /><div className="leg-detail"><span>{leg.mode === "walking" ? <Icon name="walk" size={17} /> : <Icon name="train" size={17} />} {leg.mode === "walking" ? "徒歩" : "電車"} 約{leg.minutes}分 <small>・{leg.distance}</small></span><a href={mapsUrl(leg.from, leg.to, leg.mode)} target="_blank" rel="noreferrer">Googleマップで確認 <Icon name="external" size={13} /></a></div></div> : null}</div>; })}
      </div><div className="breakdown-card"><h3>所要時間の内訳</h3><div><span>各地点での滞在</span><strong>{formatMinutes(stayTotal)}</strong></div><div><span>取得できた区間の移動</span><strong>{formatMinutes(moveTotal)}</strong></div><div><span>アプリが設ける余裕時間</span><strong>{formatMinutes(buffer)}</strong></div><div className="breakdown-total"><span>合計</span><strong>{formatMinutes(total)}</strong></div><p>経路に含まれる待ち時間は、余裕時間へ二重に加算していません。</p></div></div>
      <aside className="course-sidebar"><div className="sidebar-card"><div className="content-heading"><div><span className="section-kicker">LOCAL PICKS</span><h2>寄り道を追加</h2></div><span>{activeDetours.length}件追加中</span></div><p className="sidebar-intro">選ぶたびに訪問順・時間・費用を再計算します。</p><div className="detour-list">{detours.map((detour) => { const active = selectedDetours.includes(detour.id); const limit = selectedSpots.length + selectedDetours.length >= 5 && !active; return <article className={`detour-card ${active ? "is-added" : ""}`} key={detour.id}><div className="detour-top"><span className={`category category-${detour.id}`}>{detour.category}</span><span><Icon name="clock" size={13} /> {detour.stayMinutes}分</span></div><h3>{detour.name}</h3><p>{detour.description}</p><div className="detour-meta"><span>{detour.hours}</span><span>{detour.reservation}</span></div><div className="detour-reason"><Icon name="sparkles" size={15} /> {detour.reason}</div><div className="detour-bottom"><span>{detour.priceLabel}</span><button type="button" onClick={() => toggleDetour(detour)} disabled={limit}>{active ? <><Icon name="x" size={15} /> 削除</> : <><Icon name="plus" size={15} /> 追加</>}</button></div></article>; })}</div><p className="limit-note">聖地と寄り道を合わせて最大5件まで追加できます。</p></div>
      <div className="sidebar-card cost-card"><span className="section-kicker">COST</span><h2>費用の目安</h2><div><span>現地交通費</span><strong>{transitCost ? `${transitCost}円` : "0円（徒歩のみ）"}</strong></div><div><span>施設料金</span><strong>{facilityCost}円</strong></div><div><span>飲食・体験</span><strong>{detourCost ? `参考 ${detourCost.toLocaleString()}円〜` : "今回は含まない"}</strong></div><div className="cost-total"><span>取得できた範囲の合計</span><strong>{(transitCost + facilityCost + detourCost).toLocaleString()}円〜</strong></div>{activeDetours.some((item) => item.price === null) ? <p><Icon name="info" size={15} /> よりみち朝市の購入費は不明のため合計に含みません。</p> : null}</div></aside></div>
      <div className="important-notice"><Icon name="warning" size={23} /><div><h2>出発前に必ずご確認ください</h2><p>このコースは旅の下書きです。乗車便、運行状況、臨時休業、予約成立、終了時刻への帰着を保証しません。</p><ul><li>各区間のGoogleマップで訪問日時を設定し、最新の経路を確認</li><li>施設・交通機関の公式サイトで営業・運行情報を確認</li><li>予約推奨・必要なスポットは事前に手続き</li></ul></div></div>
      <details className="judgement-guide"><summary>4つのコース判定について <Icon name="chevron" size={17} /></summary><div><p><b className="guide-good">目安では収まる</b> 概算が希望時間内。便や帰着は未保証です。</p><p><b className="guide-caution">要確認</b> 重要な情報が不足、または余裕が少ない状態です。</p><p><b className="guide-over">目安でも収まらない</b> 時間超過や登録済み休業日があります。</p><p><b className="guide-unknown">計算できない</b> 経路障害・データ不足・探索上限です。訪問不可能とは限りません。</p></div></details>
    </section>
  );
}

export default function PlannerApp() {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState("");
  const [selectedSpotIds, setSelectedSpotIds] = useState<string[]>(["crossing", "viewpoint"]);
  const [selectedDetourIds, setSelectedDetourIds] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Conditions>({ date: "2026-10-17", startPoint: stations[0], endPoint: stations[0], startTime: "10:00", endTime: "16:30", durations: Object.fromEntries(spots.map((spot) => [spot.id, spot.stayMinutes])) });
  const selectedSpots = spots.filter((spot) => selectedSpotIds.includes(spot.id));
  const reset = () => { setStep(1); setSearch(""); setSelectedSpotIds(["crossing", "viewpoint"]); setSelectedDetourIds([]); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goTo = (next: Step) => { setStep(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const toggleSpot = (spot: Spot) => setSelectedSpotIds((current) => current.includes(spot.id) ? current.filter((id) => id !== spot.id) : current.length < 3 ? [...current, spot.id] : current);
  const toggleDetour = (detour: Detour) => setSelectedDetourIds((current) => current.includes(detour.id) ? current.filter((id) => id !== detour.id) : selectedSpots.length + current.length < 5 ? [...current, detour.id] : current);
  return <div className="app-shell"><AppHeader onReset={reset} /><Stepper step={step} goTo={goTo} /><main>{step === 1 ? <Intro search={search} setSearch={setSearch} onNext={() => goTo(2)} /> : null}{step === 2 ? <SpotSelection selected={selectedSpotIds} onToggle={toggleSpot} onNext={() => goTo(3)} onBack={() => goTo(1)} /> : null}{step === 3 ? <ConditionsForm conditions={conditions} setConditions={setConditions} selectedSpots={selectedSpots} onNext={() => goTo(4)} onBack={() => goTo(2)} /> : null}{step === 4 ? <CourseResult selectedSpots={selectedSpots} selectedDetours={selectedDetourIds} toggleDetour={toggleDetour} conditions={conditions} onBack={() => goTo(3)} /> : null}</main><footer><div><Image src="/app-icon.png" alt="" width={548} height={494} /><strong>めぐりっぷ</strong></div><p>物語とまちを、やさしくつなぐ。</p><small>掲載情報はすべてフロントエンド確認用のデモデータです。</small></footer></div>;
}
