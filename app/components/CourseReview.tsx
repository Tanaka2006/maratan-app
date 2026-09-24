import type { Work } from "../types/work";
import type { Spot } from "../types/spot";
import type { TripConditionsInput, TripLocation } from "../types/trip";

type Props = {
  work: Work;
  spots: Spot[];
  conditions: TripConditionsInput;
  locations: TripLocation[];
  onBack: () => void;
};

// 経路・時刻表の計算ではなく、日本時間の入力時刻の差だけを表示します。
function availableTimeLabel(startTime: string, endTime: string) {
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(startTime) || !timePattern.test(endTime)) return "未計算（時刻を入力してください）";
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  if (minutes <= 0) return "未計算（終了時刻を同日の開始時刻より後にしてください）";
  return `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

export default function CourseReview({ work, spots, conditions, locations, onBack }: Props) {
  const startLocation = locations.find((location) => location.id === conditions.startLocationId);
  const endLocation = locations.find((location) => location.id === conditions.endLocationId);

  return (
    <section aria-labelledby="review-title">
      <button type="button" onClick={onBack} className="mp-button-secondary mb-6">← 条件入力に戻る</button>
      <p className="mp-step">STEP 04 / コース確認</p>
      <h1 id="review-title" className="mp-title">旅の選択内容を確認</h1>
      <p className="mp-description">現在は選択・入力した内容を確認できます。入力を変更するときは、条件入力に戻ってください。</p>
      <aside className="mp-notice mt-6">
        <p className="font-bold">コースは未計算です</p>
        <p className="mt-1">作品・聖地・開始終了地点はダミーデータです。交通API・DB・経路計算は未接続で、実際に巡れるかは判定していません。</p>
      </aside>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2 xl:gap-8">
      <section aria-labelledby="selection-summary" className="mp-card">
        <h2 id="selection-summary" className="text-lg font-bold">選択・入力内容</h2>
        <p className="mt-2 text-xs leading-6 text-muted">日時は日本時間（JST）。開始・終了時刻は入力条件であり、電車・バスの発着時刻ではありません。</p>
        <dl className="mp-details mt-5">
          <div><dt className="font-bold">選択した作品</dt><dd className="break-words text-muted">{work.name}</dd></div>
          <div><dt className="font-bold">訪問日</dt><dd className="text-muted">{conditions.visitDate || "未入力"}</dd></div>
          <div><dt className="font-bold">開始地点</dt><dd className="text-muted">{startLocation?.name ?? "未選択"}</dd></div>
          <div><dt className="font-bold">開始時刻（入力条件）</dt><dd className="text-muted">{conditions.startTime || "未入力"}</dd></div>
          <div><dt className="font-bold">終了地点</dt><dd className="text-muted">{endLocation?.name ?? "未選択"}</dd></div>
          <div><dt className="font-bold">終了時刻（入力条件）</dt><dd className="text-muted">{conditions.endTime || "未入力"}</dd></div>
        </dl>
        <div className="mt-5 rounded-control bg-brand-soft p-4">
          <h3 className="font-bold">使える時間</h3>
          <p className="mt-2">{availableTimeLabel(conditions.startTime, conditions.endTime)}</p>
          <p className="mt-2 text-xs leading-6 text-muted">入力した開始・終了時刻の差です。コースの所要時間ではありません。</p>
        </div>
        <h3 className="mt-6 font-bold">選択した聖地・滞在時間</h3>
        <p className="mt-2 text-xs text-muted">一覧の並びは、計算された訪問順ではありません。</p>
        <ul className="mt-3 space-y-3">
          {spots.map((spot) => {
            const stay = conditions.stayMinutesBySpot[spot.id] ?? String(spot.suggestedStayMinutes);
            const invalid = stay !== "" && (!Number.isFinite(Number(stay)) || Number(stay) <= 0);
            return (
              <li key={spot.id} className="rounded-control border border-line p-4">
                <p className="break-words font-bold">{spot.name}</p>
                <p className="mt-2 text-sm text-muted">滞在時間：{stay === "" ? "未入力" : `${stay}分`}</p>
                {invalid && <p className="mt-1 text-sm text-brand-ink">条件入力に戻って、0より大きい分数を入力してください。</p>}
              </li>
            );
          })}
        </ul>
      </section>

      {/* 将来、取得・計算したコース結果を表示する領域。入力条件とは分けます。 */}
      <section aria-labelledby="course-results" className="mp-card">
        <h2 id="course-results" className="text-lg font-bold">コース結果 <span className="mp-pill bg-coral-soft text-coral-ink">未計算</span></h2>
        <dl className="mp-details mt-5">
          <div><dt className="font-bold">時系列の旅程</dt><dd className="text-muted">未計算。経路計算の接続後に表示します。</dd></div>
          <div><dt className="font-bold">電車・バス・徒歩</dt><dd className="text-muted">未取得。交通API接続後に表示します。</dd></div>
          <div><dt className="font-bold">発着時刻</dt><dd className="text-muted">未取得。交通API接続後に表示します。</dd></div>
          <div><dt className="font-bold">費用</dt><dd className="text-muted">未計算。交通費・入場料・飲食や体験費は未取得です。</dd></div>
          <div><dt className="font-bold">予約要否</dt><dd className="text-muted">未取得。必要・不要はまだ確認していません。</dd></div>
          <div><dt className="font-bold">注意事項・営業時間</dt><dd className="text-muted">未取得。施設・交通の確認済み情報を接続後に表示します。</dd></div>
          <div><dt className="font-bold">地図リンク</dt><dd className="text-muted">未作成。実際の地点・区間が確定した後に表示します。</dd></div>
        </dl>
      </section>
      </div>
      <section aria-labelledby="detour-results" className="mp-card mt-8 border-dashed bg-accent-soft">
        <h2 id="detour-results" className="text-lg font-bold">寄り道候補</h2>
        <p className="mt-3 text-sm leading-7 text-muted">未取得。今後、寄り道候補が表示される領域です。推薦・追加・再計算の処理はまだ接続していません。</p>
      </section>
    </section>
  );
}
