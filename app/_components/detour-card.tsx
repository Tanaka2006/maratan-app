"use client";

import type { VerifiedDetour } from "../_data/anilist-types";
import { DETOUR_CATEGORY_LABELS, openingHoursTextFor } from "../_data/local-detours";

/** 「〇〇と△△の間で寄りやすい場所です」を「〇〇と△△の間」に縮める。 */
export function shortSlot(label: string | null | undefined) {
  return label ? label.replace(/[でに]寄りやすい場所です$/, "") : null;
}

export function detourMapsUrl(spot: VerifiedDetour) {
  return spot.maps_uri ?? `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: spot.name, query_place_id: spot.place_id })}`;
}

export function DetourBadge({ spot }: { spot: Pick<VerifiedDetour, "category"> }) {
  return <span className={`detour-badge is-${spot.category}`}>{DETOUR_CATEGORY_LABELS[spot.category]}</span>;
}

/** 寄り道の候補。初期表示は「何にふれられるか」と「どこで寄れるか」だけにし、詳細は開いて見る。 */
export default function DetourCard({ spot, checked, disabled, closed, visitDate, onToggle }: {
  spot: VerifiedDetour;
  checked: boolean;
  disabled: boolean;
  closed: boolean;
  visitDate: string;
  onToggle: () => void;
}) {
  const hours = openingHoursTextFor(spot.weekday_hours, visitDate);
  const slot = shortSlot(spot.slot_label);
  return <li className={`detour-card${checked ? " is-selected" : ""}${closed ? " is-closed" : ""}`}>
    <label className="detour-card-main">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} />
      <span className="detour-card-text">
        <span className="detour-card-title"><DetourBadge spot={spot} /><strong>{spot.name}</strong></span>
        {spot.local_feature ? <span className="detour-feature">{spot.local_feature}</span> : null}
        <small>{slot ? `${slot}・` : ""}滞在 約{spot.stay_minutes}分</small>
        {closed ? <small className="detour-closed">選んだ日は定休日の可能性があります</small> : null}
      </span>
    </label>
    <details className="detail-disclosure detour-more">
      <summary>詳しく見る</summary>
      <div className="disclosure-body">
        {spot.detour_reason ? <p>{spot.detour_reason}</p> : null}
        {hours ? <p>営業時間（Googleマップ）：{hours}</p> : null}
        <div className="disclosure-links">
          <a href={detourMapsUrl(spot)} target="_blank" rel="noreferrer">Googleマップで見る ↗</a>
          {spot.official_url ? <a href={spot.official_url} target="_blank" rel="noreferrer">公式サイト ↗</a> : null}
        </div>
      </div>
    </details>
  </li>;
}

export function DetourNote() {
  return <p className="detour-note">紹介文はAIがGoogleマップの情報をもとに作成したもので、作品とは関係ありません。営業時間などは訪問前に公式情報で確認してください。</p>;
}
