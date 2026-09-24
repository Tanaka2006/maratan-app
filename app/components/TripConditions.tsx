import type { Spot } from "../types/spot";
import type { TripConditionsInput, TripLocation } from "../types/trip";

type Props = {
  conditions: TripConditionsInput;
  locations: TripLocation[];
  spots: Spot[];
  onChange: (conditions: TripConditionsInput) => void;
  onBack: () => void;
};

const fieldClass = "mp-input mt-2";

function minutesSinceMidnight(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function TripConditions({ conditions, locations, spots, onChange, onBack }: Props) {
  const start = minutesSinceMidnight(conditions.startTime);
  const end = minutesSinceMidnight(conditions.endTime);
  const available = start !== null && end !== null ? end - start : null;
  const invalidTime = available !== null && available <= 0;

  function update(field: keyof Omit<TripConditionsInput, "stayMinutesBySpot">, value: string) {
    onChange({ ...conditions, [field]: value });
  }

  return (
    <section aria-labelledby="conditions-title">
      <button type="button" onClick={onBack} className="mp-button-secondary mb-6">← 聖地マップに戻る</button>
      <p className="mp-step">STEP 03 / 条件入力</p>
      <h1 id="conditions-title" className="mp-title">旅の日時を決めよう</h1>
      <p className="mp-description">現地で移動を始められる時刻と、終了地点に到着したい時刻を入力してください。同日内・日本時間（JST）で扱います。</p>
      <aside className="mp-notice mt-6">開始・終了地点と滞在目安はダミーデータです。交通データは未接続のため、対応日付や実際に巡れるかはまだ判定しません。</aside>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2 xl:gap-8">
      <section className="mp-card h-full" aria-labelledby="date-section">
        <h2 id="date-section" className="mp-section-title"><span className="mp-number">1</span>訪問日 <span className="mp-required">必須</span></h2>
        <p className="mp-section-description">現地を訪れる日を選んでください。</p>
        <label htmlFor="visit-date" className="text-sm font-bold">訪問日</label>
          <input id="visit-date" type="date" required value={conditions.visitDate} onChange={(e) => update("visitDate", e.target.value)} className={fieldClass} />
      </section>
      <section className="mp-card h-full" aria-labelledby="locations-section">
        <h2 id="locations-section" className="mp-section-title"><span className="mp-number">2</span>開始・終了地点 <span className="mp-required">必須</span></h2>
        <p className="mp-section-description">現地で旅を始める場所と、最後に到着する場所を選んでください。</p>
        <label htmlFor="start-location" className="text-sm font-bold">開始地点</label>
          <select id="start-location" required value={conditions.startLocationId} onChange={(e) => update("startLocationId", e.target.value)} className={fieldClass}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        <label htmlFor="end-location" className="mt-5 block text-sm font-bold">終了地点</label>
          <select id="end-location" required value={conditions.endLocationId} onChange={(e) => update("endLocationId", e.target.value)} className={fieldClass}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <p className="mt-2 text-xs leading-6 text-muted">初期値は開始地点と同じです。開始地点を変更しても、終了地点は自動変更しません。</p>
      </section>
      <div className="min-w-0 space-y-6">
      <section className="mp-card" aria-labelledby="times-section">
        <h2 id="times-section" className="mp-section-title"><span className="mp-number">3</span>時刻 <span className="mp-required">必須</span></h2>
        <p className="mp-section-description">同日内の開始・終了時刻を、日本時間で入力してください。</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="min-w-0"><label htmlFor="start-time" className="text-sm font-bold">開始時刻</label>
          <input id="start-time" type="time" required value={conditions.startTime} onChange={(e) => update("startTime", e.target.value)} aria-invalid={invalidTime} aria-describedby="available-time" className={fieldClass} />
          </div>
          <div className="min-w-0"><label htmlFor="end-time" className="text-sm font-bold">終了時刻</label>
          <input id="end-time" type="time" required value={conditions.endTime} onChange={(e) => update("endTime", e.target.value)} aria-invalid={invalidTime} aria-describedby="available-time" className={fieldClass} />
          </div>
        </div>
      </section>
      <div id="available-time" role="status" className="mt-6 rounded-control border border-brand/25 bg-brand-soft p-5">
        <p className="font-bold">使える時間</p>
        <p className="mt-2">{available === null ? "開始時刻と終了時刻を入力してください。" : invalidTime ? "終了時刻は、同日の開始時刻より後にしてください。" : `${Math.floor(available / 60)}時間${available % 60}分`}</p>
        <p className="mt-2 text-xs leading-6 text-muted">開始・終了時刻の差です。移動や滞在を含めて巡れるかの判定ではありません。</p>
      </div>
      </div>
      <section className="mp-card" aria-labelledby="stays-section">
        <h2 id="stays-section" className="mp-section-title"><span className="mp-number">4</span>各聖地の滞在時間 <span className="mp-required">必須</span></h2>
        <p className="mt-2 text-sm text-muted">登録された目安を初期値にしています。必要に応じて変更できます。</p>
        <div className="mt-4 space-y-4">
          {spots.map((spot) => {
            const value = conditions.stayMinutesBySpot[spot.id] ?? String(spot.suggestedStayMinutes);
            const invalid = value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0;
            return (
              <div key={spot.id} className="rounded-control border border-line bg-surface-soft p-4">
                <label htmlFor={`stay-${spot.id}`} className="font-bold">{spot.name}</label>
                <p className="mt-2 text-xs text-muted">滞在目安：{spot.suggestedStayMinutes}分（ダミー）</p>
                <div className="flex items-center gap-3">
                  <input id={`stay-${spot.id}`} type="number" required step="any" value={value} aria-invalid={invalid} aria-describedby={invalid ? `stay-error-${spot.id}` : undefined} onChange={(e) => onChange({ ...conditions, stayMinutesBySpot: { ...conditions.stayMinutesBySpot, [spot.id]: e.target.value } })} className={fieldClass} />
                  <span>分</span>
                </div>
                {invalid && <p id={`stay-error-${spot.id}`} className="mt-2 text-sm text-brand-ink">0より大きい分数を入力してください。</p>}
              </div>
            );
          })}
        </div>
      </section>
      </div>
      <p className="mt-6 text-sm leading-6 text-muted">次の画面で選択・入力内容を確認できます。経路計算はまだ実装していません。</p>
    </section>
  );
}
