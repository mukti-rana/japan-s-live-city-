// Everything on the Emergency Center that matters in a crisis lives in this one
// file and is bundled into the page — it never depends on an API, a database or
// a login. Each number below was checked on the publishing organisation's own
// website on 2026-10-29 (see `source`). Numbers we could not find on an
// official page (for example the JNTO visitor hotline and Japan Helpline) are
// deliberately NOT printed; the official sites are linked instead.

export const VERIFIED_ON = "2026-10-29";

export interface EmergencyNumber {
  id: "police" | "fire" | "ambulance" | "coastguard";
  number: string;
  // What it is for, in the words of the person who needs it.
  use: { en: string; ja: string };
  say: { ja: string; romaji: string; en: string };
  source: { name: string; url: string };
}

// 110 / 119 / 118 are free, answered 24 hours a day, and work from any phone
// with no area code. 119 is one number for both fire and ambulance.
export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  {
    id: "police",
    number: "110",
    use: {
      en: "Crime, danger to you or someone else, or a traffic accident.",
      ja: "事件・事故、身の危険があるとき。",
    },
    say: { ja: "警察をお願いします。", romaji: "Keisatsu o onegai shimasu.", en: "Police, please." },
    source: { name: "National Police Agency", url: "https://www.npa.go.jp/english/index.html" },
  },
  {
    id: "fire",
    number: "119",
    use: {
      en: "Fire, or someone needs rescue (trapped, fallen, in danger).",
      ja: "火事のとき、救助が必要なとき。",
    },
    say: { ja: "火事です。", romaji: "Kaji desu.", en: "There is a fire." },
    source: { name: "Fire and Disaster Management Agency", url: "https://www.fdma.go.jp/en/" },
  },
  {
    id: "ambulance",
    number: "119",
    use: {
      en: "Sudden serious illness or injury. Same number as fire — say you need an ambulance.",
      ja: "急な病気やけがで救急車が必要なとき。火事と同じ番号です。",
    },
    say: { ja: "救急です。", romaji: "Kyūkyū desu.", en: "I need an ambulance." },
    source: { name: "Fire and Disaster Management Agency", url: "https://www.fdma.go.jp/en/" },
  },
  {
    id: "coastguard",
    number: "118",
    use: {
      en: "Accidents or danger at sea, on the coast, or in the water (boats, people in the water).",
      ja: "海での事故や危険があるとき。",
    },
    say: { ja: "海上保安庁をお願いします。", romaji: "Kaijō hoan-chō o onegai shimasu.", en: "Coast Guard, please." },
    source: { name: "Japan Coast Guard", url: "https://www.kaiho.mlit.go.jp/" },
  },
];

// The three numbers shown together wherever space is tight (the quick-access
// panel and the top of the Emergency Center). 119 is one number for both fire
// and ambulance, so they share a card.
export const QUICK_NUMBERS: {
  id: "police" | "fire" | "coastguard";
  number: string;
  ids: EmergencyNumber["id"][];
  label: { en: string; ja: string };
  short: { en: string; ja: string };
}[] = [
  {
    id: "police",
    number: "110",
    ids: ["police"],
    label: { en: "Police", ja: "警察" },
    short: { en: "Crime, danger to you or someone else, or a traffic accident.", ja: "事件・事故、身の危険があるとき。" },
  },
  {
    id: "fire",
    number: "119",
    ids: ["fire", "ambulance"],
    label: { en: "Fire / Ambulance", ja: "消防・救急" },
    short: { en: "Fire, a rescue, or a sudden serious illness or injury.", ja: "火事・救助、急な病気やけがのとき。" },
  },
  {
    id: "coastguard",
    number: "118",
    ids: ["coastguard"],
    label: { en: "Coast Guard", ja: "海上保安庁" },
    short: { en: "Accidents or danger at sea, on the coast, or in the water.", ja: "海での事故や危険があるとき。" },
  },
];

// JNTO's Japan Visitor Hotline: a multilingual support line for visitors. It
// is not an emergency service. Number and scope as published by JNTO / Japan
// Travel (japan.travel/en/plan/hotline/), checked 2026-10-30.
export const VISITOR_HOTLINE = {
  number: "050-3816-2787",
  international: "+81-50-3816-2787",
  tel: "05038162787",
  source: { name: "Japan National Tourism Organization", url: "https://www.japan.travel/en/plan/hotline/" },
  note: {
    en: "A multilingual support line for visitors run by JNTO: English, Chinese and Korean, 24 hours a day, every day. It can help with illness or injury, disasters, and general travel trouble — for example finding a hospital or understanding what is happening. It is visitor support, not an emergency service: it cannot send an ambulance, police or fire crew.",
    ja: "訪日旅行者向けの多言語サポート窓口（JNTO運営）。英語・中国語・韓国語に対応し、24時間・年中無休です。病気やけが、災害、旅行中のトラブル（病院探しや状況の確認など）の相談ができます。緊急通報サービスではないため、救急車・警察・消防の出動はできません。",
  },
  warning: {
    en: "In danger, or if someone's life is at risk, call 110 or 119 first.",
    ja: "身の危険や命に関わるときは、まず110番・119番へ。",
  },
};

// What the operator will ask for. General guidance; always follow what the
// operator tells you.
export const CALL_CHECKLIST = {
  en: [
    "What happened — fire, someone is hurt or ill, a crime, an accident at sea.",
    "Where you are — an address, the nearest station or a landmark. Look for a building name or sign.",
    "Who needs help and how many — their condition, whether they are awake and breathing.",
    "Your name and phone number, so they can call you back.",
    "Stay on the line and follow the instructions. Do not hang up until the operator says so.",
  ],
  ja: [
    "何があったか — 火事、けが・急病、事件、海での事故など。",
    "どこにいるか — 住所、最寄り駅、目印になる建物や看板。",
    "誰が・何人、どんな状態か — 意識や呼吸があるかどうか。",
    "あなたの名前と電話番号（折り返しのため）。",
    "電話を切らず、指示に従ってください。切るのは指示があってからです。",
  ],
};

export const CALL_NOTES = {
  en: [
    "Calls to 110, 119 and 118 are free and answered 24 hours a day. No area code is needed.",
    "The operator will answer in Japanese. In some areas an interpreter can be connected, but this is not guaranteed — speak slowly, say what you need, and give your location.",
    "If you can't speak, stay on the line. The call can often be traced to help find you.",
  ],
  ja: [
    "110・119・118は無料で、24時間つながります。市外局番は不要です。",
    "応対は日本語です。地域によっては通訳につながる場合がありますが、保証はありません。ゆっくり、必要なことと場所を伝えてください。",
    "話せないときも切らずにいてください。通報の発信地から場所を特定できる場合があります。",
  ],
};

export const DESKTOP_CALL_NOTE = {
  en: "On a computer, the call buttons may do nothing. Pick up your phone and dial the number. The buttons only open your phone app — they do not place a call by themselves.",
  ja: "パソコンでは発信ボタンが動作しないことがあります。お手持ちの電話から番号をダイヤルしてください。ボタンは電話アプリを開くだけで、自動で発信はしません。",
};

// ── Other official numbers (not for emergencies) ─────────────────────────

export interface OtherNumber {
  id: string;
  number: string;
  label: { en: string; ja: string };
  note: { en: string; ja: string };
  source: { name: string; url: string };
}

export const OTHER_NUMBERS: OtherNumber[] = [
  {
    id: "9110",
    number: "#9110",
    label: { en: "Police consultation (non-emergency)", ja: "警察相談専用電話" },
    note: {
      en: "For worries and consultations that are not an emergency — scams, stalking, lost items, minor trouble. It connects to the police consultation desk of the prefecture you call from. Hours differ by prefecture, and it does not work from some phone lines; if it doesn't connect, use your prefectural police's regular number.",
      ja: "緊急ではない相談（詐欺、つきまとい、落とし物、困りごとなど）用です。発信地の都道府県警察の相談窓口につながります。受付時間は都道府県で異なり、一部の回線ではつながりません。つながらない場合は各警察の一般電話番号へ。",
    },
    source: { name: "Government of Japan (Public Relations Online)", url: "https://www.gov-online.go.jp/kurashinosodan/list/ct_bouhan.html" },
  },
  {
    id: "7119",
    number: "#7119",
    label: { en: "Ambulance & medical consultation (some areas only)", ja: "救急安心センター事業" },
    note: {
      en: "Advice on whether you need an ambulance or a hospital. It is available only in some areas of Japan. If you think it is life-threatening, do not wait — call 119.",
      ja: "救急車を呼ぶべきか、病院に行くべきかの相談窓口です。実施している地域に限られます。命に関わると思うときは迷わず119番へ。",
    },
    source: { name: "Fire and Disaster Management Agency", url: "https://www.fdma.go.jp/mission/enrichment/appropriate/appropriate003.html" },
  },
  {
    id: "171",
    number: "171",
    label: { en: "Disaster Message Dial", ja: "災害用伝言ダイヤル" },
    note: {
      en: "A voice-message service for large disasters: you record a message and family can play it back. It only works after the service has been started during a disaster. Not for reporting emergencies.",
      ja: "大規模災害時に、安否を音声で録音・再生できるサービスです。災害時にサービスが開始されたときのみ利用できます。通報には使えません。",
    },
    source: { name: "NTT East", url: "https://www.ntt-east.co.jp/saigai/voice171/" },
  },
];

// ── Guidance ─────────────────────────────────────────────────────────────

export type Urgency = "emergency" | "non-emergency" | "information";

export interface Scenario {
  id: string;
  title: { en: string; ja: string };
  urgency: Urgency;
  call?: string;
  steps: { en: string[]; ja: string[] };
  links?: { label: { en: string; ja: string }; url: string }[];
}

// General safety guidance only. Always follow the instructions of the
// emergency services on the phone and of local authorities.
export const SCENARIOS: Scenario[] = [
  {
    id: "medical",
    title: { en: "Serious illness or injury", ja: "急な病気・けが" },
    urgency: "emergency",
    call: "119",
    steps: {
      en: [
        "Call 119 and say “Kyūkyū desu” (I need an ambulance).",
        "Give the address or the nearest landmark or building name. If you are unsure, say what you can see.",
        "Describe what happened and the person's condition. Stay on the line.",
        "Do not move a seriously injured person unless there is immediate danger. Send someone outside to guide the ambulance.",
        "Not sure it is serious? In some areas #7119 gives advice — but if you think it could be life-threatening, call 119.",
      ],
      ja: [
        "119番に電話し、「救急です」と伝えます。",
        "住所、または近くの目印・建物名を伝えます。わからないときは見えるものを伝えてください。",
        "何があったか、症状を伝え、電話を切らずに指示に従います。",
        "重いけがの人は、危険が迫っていない限り動かさないでください。救急隊を誘導する人を外に出します。",
        "迷うときは、地域によっては#7119で相談できます。命に関わると思うときは119番へ。",
      ],
    },
  },
  {
    id: "fire",
    title: { en: "Fire and rescue", ja: "火事・救助" },
    urgency: "emergency",
    call: "119",
    steps: {
      en: [
        "Shout “Kaji da!” (Fire!) to warn others, and get out. Stay low if there is smoke.",
        "Do not use elevators. Close doors behind you if you can do so safely.",
        "Once you are safe, call 119 and say “Kaji desu” (There is a fire). Give the address and what is burning.",
        "Never go back inside for belongings.",
      ],
      ja: [
        "「火事だ！」と叫んで周りに知らせ、避難します。煙があるときは姿勢を低くします。",
        "エレベーターは使わず、安全にできるときは扉を閉めて逃げます。",
        "安全な場所から119番に電話し、「火事です」と伝え、住所と燃えているものを伝えます。",
        "荷物を取りに戻らないでください。",
      ],
    },
  },
  {
    id: "crime",
    title: { en: "Crime and immediate danger", ja: "犯罪・身の危険" },
    urgency: "emergency",
    call: "110",
    steps: {
      en: [
        "Get to a safe place first, if you can. Then call 110 and say “Keisatsu o onegai shimasu” (Police, please).",
        "Say what happened, where you are, and whether anyone is hurt or still dangerous.",
        "Stay on the line and follow the operator's instructions.",
      ],
      ja: [
        "まず安全な場所へ。110番に電話し、「警察をお願いします」と伝えます。",
        "何があったか、今いる場所、けが人や危険な人がまだいるかを伝えます。",
        "電話を切らず、指示に従ってください。",
      ],
    },
  },
  {
    id: "traffic",
    title: { en: "Traffic accident", ja: "交通事故" },
    urgency: "emergency",
    call: "119 / 110",
    steps: {
      en: [
        "Move to safety and, if possible, stop traffic from hitting anyone. Turn off engines.",
        "If anyone is hurt, call 119 first. Then call 110 — in Japan every traffic accident, even a minor one, must be reported to the police.",
        "Do not leave the scene. Exchange details with the other party and wait for the police.",
      ],
      ja: [
        "安全な場所へ移動し、可能なら後続車から守ります。エンジンを切ります。",
        "けが人がいれば先に119番、続けて110番へ。日本では軽い事故でも警察への届け出が必要です。",
        "現場を離れず、相手と連絡先を交換して警察を待ちます。",
      ],
    },
  },
  {
    id: "earthquake",
    title: { en: "Earthquake and tsunami", ja: "地震・津波" },
    urgency: "emergency",
    steps: {
      en: [
        "Drop, cover and hold on: get under a sturdy table and protect your head. Stay away from windows and things that can fall.",
        "After the shaking stops, check for fire and injuries. Turn off gas and stoves if it is safe.",
        "If you are near the coast and feel strong or long shaking, move to high ground or a tall building straight away — do not wait for an official warning.",
        "Follow the instructions in official alerts (JMA, city announcements). Aftershocks are common.",
      ],
      ja: [
        "まず身の安全を守る：頑丈なテーブルの下に入り、頭を守ります。窓や落下物から離れます。",
        "揺れが収まったら、火の始末とけが人の確認をします。安全にできるときはガスを止めます。",
        "海岸近くで強い揺れや長い揺れを感じたら、警報を待たずにすぐ高台や高い建物へ避難します。",
        "気象庁や自治体の情報に従ってください。余震に注意します。",
      ],
    },
    links: [{ label: { en: "JMA earthquake & tsunami information", ja: "気象庁 地震・津波情報" }, url: "https://www.jma.go.jp/bosai/map.html" }],
  },
  {
    id: "typhoon",
    title: { en: "Typhoons, flooding and evacuation", ja: "台風・大雨・避難" },
    urgency: "emergency",
    steps: {
      en: [
        "Check official warnings and your city's evacuation information early — do not wait until it is dangerous.",
        "Japan uses Alert Levels 1–5. At Level 3 people who need more time (elderly, disabled, with small children) should evacuate; at Level 4 everyone in the area should evacuate; Level 5 means the danger has already arrived — protect your life in the safest place you can reach.",
        "Move to the designated shelter on foot if possible, or to the upper floor of a sturdy building. Avoid flooded roads, rivers and underpasses.",
        "If you are in danger now, call 119.",
      ],
      ja: [
        "気象庁の警報や自治体の避難情報を早めに確認し、危険になる前に行動します。",
        "警戒レベルは1〜5。レベル3は高齢者など避難に時間がかかる人が避難、レベル4は全員避難、レベル5はすでに災害が発生・切迫している状況で、命を守る行動をとります。",
        "できるだけ徒歩で指定避難所へ。難しいときは頑丈な建物の上の階へ。冠水した道路、川、アンダーパスは避けます。",
        "今すぐ危険なときは119番へ。",
      ],
    },
    links: [
      { label: { en: "JMA warnings map", ja: "気象庁 警報・注意報" }, url: "https://www.jma.go.jp/bosai/map.html#contents=warning" },
      { label: { en: "Hazard map portal (GSI)", ja: "ハザードマップポータルサイト" }, url: "https://disaportal.gsi.go.jp/" },
    ],
  },
  {
    id: "gas",
    title: { en: "Gas leaks", ja: "ガス漏れ" },
    urgency: "emergency",
    call: "119",
    steps: {
      en: [
        "Do not use flames, light switches, lighters or anything that can spark. Do not use electric fans.",
        "Open windows and doors to let the gas out. Close the gas valve if you can do it safely.",
        "Leave the building. From outside, call your gas company's emergency number (shown on your bill or meter) — or call 119 if the smell is strong or there is any danger.",
      ],
      ja: [
        "火気、電気のスイッチ、ライターなど火花が出るものを使わないでください。換気扇も使いません。",
        "窓や戸を開けて換気し、安全にできるならガスの元栓を閉めます。",
        "建物の外に出て、請求書やメーターに書かれたガス会社の緊急連絡先へ。においが強い、危険があるときは119番へ。",
      ],
    },
  },
  {
    id: "coastguard",
    title: { en: "Coast Guard emergencies", ja: "海での緊急事態" },
    urgency: "emergency",
    call: "118",
    steps: {
      en: [
        "Call 118 for accidents or danger at sea: boats in trouble, people in the water, drifting, or serious injury on a vessel.",
        "Give your position — a landmark, beach name, port, or GPS coordinates — and what is happening.",
        "Do not enter rough water to rescue someone. Throw something that floats and keep watching them.",
      ],
      ja: [
        "海での事故・危険（船のトラブル、水に落ちた人、漂流、船上の大けがなど）は118番へ。",
        "場所（目印、海岸名、港、座標）と状況を伝えます。",
        "荒れた海に入って助けようとしないでください。浮くものを投げ、目を離さないようにします。",
      ],
    },
  },
  {
    id: "lost",
    title: { en: "Lost property and non-urgent police inquiries", ja: "落とし物・緊急ではない警察相談" },
    urgency: "non-emergency",
    steps: {
      en: [
        "Do not call 110. Lost or stolen items can be reported at the nearest koban (police box) or police station — they will take a report and tell you what to do next.",
        "For a worry or consultation that is not an emergency, call #9110 (police consultation).",
        "Items left on trains or in stations are usually held by the railway company; ask at the station.",
      ],
      ja: [
        "110番には電話しないでください。落とし物・盗難は最寄りの交番または警察署で届け出ます。",
        "緊急ではない相談は#9110（警察相談専用電話）へ。",
        "電車や駅での忘れ物は、多くの場合、鉄道会社が保管しています。駅で尋ねてください。",
      ],
    },
  },
  {
    id: "medical-find",
    title: { en: "Finding hospitals, pharmacies and medical help", ja: "病院・薬局・医療機関を探す" },
    urgency: "information",
    steps: {
      en: [
        "For an emergency, call 119 — don't travel by yourself if you may be seriously ill.",
        "To find a clinic or hospital that can help foreign visitors, use JNTO's medical-institution search. For hospitals and pharmacies across Japan, use the Ministry of Health's national search (Japanese).",
        "Take your passport, insurance details and any medication names with you. Many clinics have limited English — a translation app or a Japanese-speaking friend helps.",
        "Use “Nearby help” on this page to find facilities close to a place you choose.",
      ],
      ja: [
        "緊急のときは119番へ。重い症状が疑われるときは、ご自身で移動しないでください。",
        "外国人旅行者に対応できる医療機関は、JNTOの医療機関検索で探せます。全国の病院・薬局は厚生労働省の医療情報ネット（日本語）で検索できます。",
        "パスポート、保険の情報、服用中の薬の名前を持っていきます。",
        "このページの「近くの施設」で、選んだ場所の近くの施設を探せます。",
      ],
    },
    links: [
      { label: { en: "JNTO — find a medical institution", ja: "JNTO 医療機関検索" }, url: "https://www.jnto.go.jp/emergency/eng/mi_guide.html" },
      { label: { en: "Ministry of Health — national hospital & pharmacy search (Japanese)", ja: "厚生労働省 医療情報ネット" }, url: "https://www.iryou.teikyouseido.mhlw.go.jp/znk-web/juminkanja/S2300/initialize" },
    ],
  },
  {
    id: "international",
    title: { en: "Help for international residents and visitors", ja: "外国人住民・旅行者のための支援" },
    urgency: "information",
    steps: {
      en: [
        "JNTO's Safety Tips page has disaster information and a multilingual visitor support service. Check it for the current hotline details.",
        "Japan Helpline is a non-profit multilingual assistance service — see its official website for current hours and numbers.",
        "Your embassy or consulate can help with lost passports and serious problems. Keep their details somewhere you can reach without a phone battery.",
        "In an emergency, still call 110 / 119 / 118 — see “Languages” above for what to expect.",
      ],
      ja: [
        "JNTOの「Safety tips」に、災害情報と多言語の旅行者サポートの案内があります。最新の連絡先は公式ページで確認してください。",
        "Japan Helplineは、多言語に対応する非営利の支援サービスです。受付時間と番号は公式サイトで確認してください。",
        "パスポートの紛失や深刻なトラブルは、大使館・領事館に相談できます。",
        "緊急時は引き続き110・119・118へ。",
      ],
    },
    links: [
      { label: { en: "JNTO — Safety Tips", ja: "JNTO Safety tips" }, url: "https://www.jnto.go.jp/safety-tips/eng/" },
      { label: { en: "Japan Helpline", ja: "Japan Helpline" }, url: "https://jhelp.com/" },
    ],
  },
];

// ── Phrases ───────────────────────────────────────────────────────────────

export type LangCode = "en" | "ja" | "ne" | "hi" | "zh" | "ko";

export interface Phrase {
  id: string;
  ja: string;
  romaji: string;
  // Respelled so an English speaker can say it out loud.
  say: string;
  tr: Record<Exclude<LangCode, "ja">, string>;
  // Phrases with a blank to fill in.
  fillIn?: boolean;
}

export const PHRASES: Phrase[] = [
  { id: "ambulance", ja: "救急車を呼んでください。", romaji: "Kyūkyūsha o yonde kudasai.", say: "kyoo-kyoo-shah oh yohn-deh koo-dah-sigh", tr: { en: "Please call an ambulance.", ne: "कृपया एम्बुलेन्स बोलाउनुहोस्।", hi: "कृपया एम्बुलेंस बुलाइए।", zh: "请叫救护车。", ko: "구급차를 불러 주세요." } },
  { id: "fire", ja: "火事です！", romaji: "Kaji desu!", say: "kah-jee dess", tr: { en: "There is a fire!", ne: "आगलागी भएको छ!", hi: "आग लगी है!", zh: "着火了！", ko: "불이 났어요!" } },
  { id: "police", ja: "警察を呼んでください。", romaji: "Keisatsu o yonde kudasai.", say: "kay-sah-tsoo oh yohn-deh koo-dah-sigh", tr: { en: "Please call the police.", ne: "कृपया प्रहरी बोलाउनुहोस्।", hi: "कृपया पुलिस को बुलाइए।", zh: "请报警。", ko: "경찰을 불러 주세요." } },
  { id: "help", ja: "助けてください。", romaji: "Tasukete kudasai.", say: "tah-soo-keh-teh koo-dah-sigh", tr: { en: "I need help.", ne: "मलाई मद्दत चाहिन्छ।", hi: "मुझे मदद चाहिए।", zh: "我需要帮助。", ko: "도움이 필요해요." } },
  { id: "location", ja: "場所は＿＿＿です。", romaji: "Basho wa ___ desu.", say: "bah-shoh wah ___ dess", fillIn: true, tr: { en: "My location is ___.", ne: "मेरो स्थान ___ हो।", hi: "मेरा स्थान ___ है।", zh: "我的位置是___。", ko: "제 위치는 ___입니다." } },
  { id: "earthquake", ja: "地震です！", romaji: "Jishin desu!", say: "jee-sheen dess", tr: { en: "Earthquake!", ne: "भूकम्प!", hi: "भूकंप!", zh: "地震了！", ko: "지진이에요!" } },
  { id: "sick", ja: "気分が悪いです。", romaji: "Kibun ga warui desu.", say: "kee-bohn gah wah-roo-ee dess", tr: { en: "I feel sick.", ne: "मलाई बिरामी महसुस भइरहेको छ।", hi: "मेरी तबीयत ठीक नहीं है।", zh: "我不舒服。", ko: "몸이 안 좋아요." } },
  { id: "english", ja: "英語を話せる人はいますか？", romaji: "Eigo o hanaseru hito wa imasu ka?", say: "eh-goh oh hah-nah-seh-roo hee-toh wah ee-mah-soo kah", tr: { en: "Is there someone who speaks English?", ne: "के यहाँ अंग्रेजी बोल्ने कोही हुनुहुन्छ?", hi: "क्या यहाँ कोई अंग्रेज़ी बोलता है?", zh: "有会说英语的人吗？", ko: "영어를 하는 분 계신가요?" } },
  { id: "shelter", ja: "避難所はどこですか？", romaji: "Hinanjo wa doko desu ka?", say: "hee-nahn-joh wah doh-koh dess kah", tr: { en: "Where is the evacuation shelter?", ne: "आपतकालीन आश्रयस्थल कहाँ छ?", hi: "आश्रय स्थल कहाँ है?", zh: "避难所在哪里？", ko: "대피소가 어디예요?" } },
  { id: "hospital", ja: "病院はどこですか？", romaji: "Byōin wa doko desu ka?", say: "byoh-een wah doh-koh dess kah", tr: { en: "Where is the hospital?", ne: "अस्पताल कहाँ छ?", hi: "अस्पताल कहाँ है?", zh: "医院在哪里？", ko: "병원이 어디예요?" } },
];

// ── Official links ────────────────────────────────────────────────────────

export const OFFICIAL_LINKS = {
  jmaWarnings: "https://www.jma.go.jp/bosai/map.html#contents=warning",
  jmaEarthquakes: "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map",
  jmaTyphoon: "https://www.jma.go.jp/bosai/map.html#contents=typhoon",
  hazardMap: "https://disaportal.gsi.go.jp/",
  jntoSafety: "https://www.jnto.go.jp/safety-tips/eng/",
  jntoMedical: "https://www.jnto.go.jp/emergency/eng/mi_guide.html",
  mhlwSearch: "https://www.iryou.teikyouseido.mhlw.go.jp/znk-web/juminkanja/S2300/initialize",
  japanHelpline: "https://jhelp.com/",
} as const;
