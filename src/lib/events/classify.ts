import type { EventKind, EventStatus } from "@/lib/events/types";

// Plain keyword rules, checked in priority order, used because municipal
// feeds rarely say what kind of event something is. They only ever sort an
// event into a type; they never add facts about it.
const KIND_RULES: { kind: EventKind; re: RegExp }[] = [
  { kind: "fireworks", re: /花火|fireworks|hanabi/i },
  { kind: "festival", re: /祭|まつり|マツリ|フェス|festival|神事|盆踊|山車|神輿|だんじり|行事|縁日/i },
  { kind: "music", re: /コンサート|音楽|ライブ|演奏|ジャズ|オーケストラ|合唱|リサイタル|concert|music|live/i },
  { kind: "food", re: /マルシェ|グルメ|フードフェス|物産|朝市|フリーマーケット|フリマ|バザー|市場|食フェス|market|marche|food/i },
  { kind: "art", re: /展覧会|展示|アート|美術|写真展|ギャラリー|博物館|exhibition|gallery|art/i },
  { kind: "culture", re: /伝統|茶道|能楽|狂言|歌舞伎|文化|歴史|着物|華道|書道|落語|culture|traditional/i },
  { kind: "sports", re: /スポーツ|マラソン|ランニング|ウォーク|体操|サッカー|野球|試合|ハイキング|sports|marathon|run/i },
];

export function classifyKind(text: string, fallback: EventKind = "other"): EventKind {
  for (const rule of KIND_RULES) if (rule.re.test(text)) return rule.kind;
  return fallback;
}

// True only when the event's own text says it suits families or children.
export function looksFamilyFriendly(text: string): boolean {
  return /親子|子ども|こども|子供|ファミリー|キッズ|乳幼児|赤ちゃん|家族|family|kids|children/i.test(text);
}

export function statusFromText(...texts: (string | undefined | null)[]): EventStatus {
  const text = texts.filter(Boolean).join(" ");
  if (/中止|取りやめ|取り止め|cancel/i.test(text)) return "cancelled";
  if (/延期|postpone/i.test(text)) return "postponed";
  return "scheduled";
}

// Free / paid is only decided when the source states a price. Anything unclear
// stays null ("not stated"), never a guess.
export function parsePrice(text: string | undefined | null): { free: boolean | null; text: string | null } {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return { free: null, text: null };
  if (/^(0|0円|０|無料|なし|free)$/i.test(clean)) return { free: true, text: "Free" };
  if (/有料/.test(clean) || /[1-9][\d,]*\s*円/.test(clean) || /¥\s*[1-9]/.test(clean)) return { free: false, text: clean.slice(0, 120) };
  if (/無料|free/i.test(clean) && !/有料|円/.test(clean)) return { free: true, text: clean.slice(0, 120) };
  return { free: null, text: clean.slice(0, 120) };
}
