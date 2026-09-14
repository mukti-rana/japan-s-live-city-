export type JlptLevel = "n5" | "n4" | "n3" | "n2" | "n1";

export interface JlptQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export const JLPT_LEVELS: { level: JlptLevel; label: string }[] = [
  { level: "n5", label: "N5" },
  { level: "n4", label: "N4" },
  { level: "n3", label: "N3" },
  { level: "n2", label: "N2" },
  { level: "n1", label: "N1" },
];

export const JLPT_QUESTIONS: Record<JlptLevel, JlptQuestion[]> = {
  n5: [
    {
      id: "n5-1",
      prompt: "わたし ___ がくせい です。",
      choices: ["は", "を", "に", "へ"],
      correctIndex: 0,
      explanation: "「は」marks the topic of the sentence — here, わたし (I).",
    },
    {
      id: "n5-2",
      prompt: "「学校」の読み方は？",
      choices: ["がっこう", "がくこう", "かっこう", "がこう"],
      correctIndex: 0,
      explanation: "学校 (school) is read がっこう.",
    },
    {
      id: "n5-3",
      prompt: "「食べます」の意味は？",
      choices: ["To eat", "To drink", "To sleep", "To read"],
      correctIndex: 0,
      explanation: "食べます (tabemasu) means \"to eat.\"",
    },
    {
      id: "n5-4",
      prompt: "えき ___ いきます。",
      choices: ["を", "で", "に", "と"],
      correctIndex: 2,
      explanation: "「に」marks the destination — going to the station.",
    },
    {
      id: "n5-5",
      prompt: "「大きい」の反対の言葉は？",
      choices: ["小さい", "高い", "安い", "新しい"],
      correctIndex: 0,
      explanation: "小さい (small) is the opposite of 大きい (big).",
    },
  ],
  n4: [
    {
      id: "n4-1",
      prompt: "日本へ行った ___ があります。",
      choices: ["こと", "もの", "とき", "ところ"],
      correctIndex: 0,
      explanation: "～たことがあります expresses past experience: \"I have been to Japan.\"",
    },
    {
      id: "n4-2",
      prompt: "「準備」の意味は？",
      choices: ["Preparation", "Promise", "Opinion", "Experience"],
      correctIndex: 0,
      explanation: "準備 (junbi) means \"preparation.\"",
    },
    {
      id: "n4-3",
      prompt: "電車が遅れた ___、会議に間に合いませんでした。",
      choices: ["ので", "のに", "ても", "なら"],
      correctIndex: 0,
      explanation: "「ので」gives a reason: \"Because the train was delayed...\"",
    },
    {
      id: "n4-4",
      prompt: "「習慣」の読み方は？",
      choices: ["しゅうかん", "しゅかん", "しゅうがん", "じゅうかん"],
      correctIndex: 0,
      explanation: "習慣 (habit/custom) is read しゅうかん.",
    },
    {
      id: "n4-5",
      prompt: "この本は難しくて、まだ読み終わって ___。",
      choices: ["いません", "ありません", "いました", "ではありません"],
      correctIndex: 0,
      explanation: "～ていません means \"haven't done ~ yet\" — still reading.",
    },
  ],
  n3: [
    {
      id: "n3-1",
      prompt: "彼は忙しい ___、毎日ジムに通っている。",
      choices: ["にもかかわらず", "にとって", "について", "によって"],
      correctIndex: 0,
      explanation: "にもかかわらず means \"despite\" — despite being busy, he still goes to the gym.",
    },
    {
      id: "n3-2",
      prompt: "「解決」の意味に最も近いのは？",
      choices: ["To solve a problem", "To decide", "To ask", "To explain"],
      correctIndex: 0,
      explanation: "解決 (kaiketsu) means \"to resolve/solve\" a problem.",
    },
    {
      id: "n3-3",
      prompt: "締め切り ___、レポートを提出しなければならない。",
      choices: ["までに", "まで", "のに", "として"],
      correctIndex: 0,
      explanation: "までに means \"by [a deadline]\" — a point by which something must happen.",
    },
    {
      id: "n3-4",
      prompt: "「経済」の読み方は？",
      choices: ["けいざい", "けいざつ", "きょうざい", "けいさい"],
      correctIndex: 0,
      explanation: "経済 (economy) is read けいざい.",
    },
    {
      id: "n3-5",
      prompt: "複雑な問題 ___、時間がかかりそうだ。",
      choices: ["なので", "なのに", "としても", "にとって"],
      correctIndex: 0,
      explanation: "な-adjective + なので gives a reason: \"since it's a complicated problem...\"",
    },
  ],
  n2: [
    {
      id: "n2-1",
      prompt: "彼の意見は正しい ___、私は納得できない。",
      choices: ["ものの", "どころか", "おかげで", "ばかりに"],
      correctIndex: 0,
      explanation: "ものの means \"although/even though\" — even though his opinion is right.",
    },
    {
      id: "n2-2",
      prompt: "「妥協」の意味は？",
      choices: ["Compromise", "Opposition", "Agreement", "Negotiation"],
      correctIndex: 0,
      explanation: "妥協 (dakyou) means \"compromise.\"",
    },
    {
      id: "n2-3",
      prompt: "台風の影響で、電車が遅れる ___。",
      choices: ["おそれがある", "にすぎない", "にほかならない", "わけではない"],
      correctIndex: 0,
      explanation: "おそれがある means \"there is a risk/concern that ~.\"",
    },
    {
      id: "n2-4",
      prompt: "「率直」の読み方は？",
      choices: ["そっちょく", "りつちょく", "そつじき", "りっちょく"],
      correctIndex: 0,
      explanation: "率直 (frankness) is read そっちょく.",
    },
    {
      id: "n2-5",
      prompt: "彼は疲れている ___、最後まで頑張った。",
      choices: ["にもかかわらず", "おかげで", "ばかりに", "ことなく"],
      correctIndex: 0,
      explanation: "にもかかわらず means \"despite\" — despite being tired, he pushed through to the end.",
    },
  ],
  n1: [
    {
      id: "n1-1",
      prompt: "「彼の努力もむなしく、計画は失敗に終わった。」の「むなしく」に近い意味は？",
      choices: ["無駄に", "確実に", "慎重に", "意図的に"],
      correctIndex: 0,
      explanation: "むなしく here means \"in vain\" (無駄に) — his effort came to nothing.",
    },
    {
      id: "n1-2",
      prompt: "「杞憂」の意味に最も近いのは？",
      choices: ["不要な心配", "大きな喜び", "重要な決断", "静かな怒り"],
      correctIndex: 0,
      explanation: "杞憂 (kiyuu) means \"needless worry\" — an unnecessary concern.",
    },
    {
      id: "n1-3",
      prompt: "この結果は、長年の研究の賜物 ___。",
      choices: ["にほかならない", "にすぎない", "どころではない", "というものだ"],
      correctIndex: 0,
      explanation: "にほかならない emphasizes \"nothing other than\" — precisely the result of years of research.",
    },
    {
      id: "n1-4",
      prompt: "「潔い」の読み方は？",
      choices: ["いさぎよい", "けっぱくい", "きよい", "せいけつい"],
      correctIndex: 0,
      explanation: "潔い (graceful/honorable, especially in defeat) is read いさぎよい.",
    },
    {
      id: "n1-5",
      prompt: "彼は約束を破った ___、誰も彼を許さなかった。",
      choices: ["ばかりに", "おかげで", "ことから", "ながらに"],
      correctIndex: 0,
      explanation: "ばかりに expresses a negative result caused solely by the preceding action.",
    },
  ],
};
