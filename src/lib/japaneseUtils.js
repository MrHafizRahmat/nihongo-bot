// ─── RESPONSE PARSER ─────────────────────────────────────────────────────────
export function parseResponse(raw) {
  const blocks = {};

  const strict = /\[([A-Z_]+)\]([\s\S]*?)\[\/\1\]/gi;
  let match;
  while ((match = strict.exec(raw))) {
    const tag = match[1].toUpperCase();
    const content = match[2].replace(/\[\/[A-Z_]+\]/g, "").trim();
    blocks[tag] = content;
  }

  const loose = /\[([A-Z_]+)\]([\s\S]*?)(?=\[[A-Z_]+]|$)/gi;
  while ((match = loose.exec(raw))) {
    const tag = match[1].toUpperCase();
    if (!blocks[tag]) {
      const content = match[2].replace(/\[\/[A-Z_]+\]/g, "").trim();
      blocks[tag] = content;
    }
  }

  const japanKey = Object.keys(blocks).find(k => k.startsWith("JAPAN"));

  return {
    japanese: japanKey ? blocks[japanKey] : null,
    romaji: blocks.ROMAJI ?? null,
    note: blocks.NOTE ?? null,
    raw
  };
}

// Katakana → romaji lookup table
const KATAKANA_ROMAJI = {
  "ア":"a","イ":"i","ウ":"u","エ":"e","オ":"o",
  "カ":"ka","キ":"ki","ク":"ku","ケ":"ke","コ":"ko",
  "サ":"sa","シ":"shi","ス":"su","セ":"se","ソ":"so",
  "タ":"ta","チ":"chi","ツ":"tsu","テ":"te","ト":"to",
  "ナ":"na","ニ":"ni","ヌ":"nu","ネ":"ne","ノ":"no",
  "ハ":"ha","ヒ":"hi","フ":"fu","ヘ":"he","ホ":"ho",
  "マ":"ma","ミ":"mi","ム":"mu","メ":"me","モ":"mo",
  "ヤ":"ya","ユ":"yu","ヨ":"yo",
  "ラ":"ra","リ":"ri","ル":"ru","レ":"re","ロ":"ro",
  "ワ":"wa","ヲ":"wo","ン":"n",
  "ガ":"ga","ギ":"gi","グ":"gu","ゲ":"ge","ゴ":"go",
  "ザ":"za","ジ":"ji","ズ":"zu","ゼ":"ze","ゾ":"zo",
  "ダ":"da","ヂ":"ji","ヅ":"zu","デ":"de","ド":"do",
  "バ":"ba","ビ":"bi","ブ":"bu","ベ":"be","ボ":"bo",
  "パ":"pa","ピ":"pi","プ":"pu","ペ":"pe","ポ":"po",
  "キャ":"kya","キュ":"kyu","キョ":"kyo",
  "シャ":"sha","シュ":"shu","ショ":"sho",
  "チャ":"cha","チュ":"chu","チョ":"cho",
  "ニャ":"nya","ニュ":"nyu","ニョ":"nyo",
  "ヒャ":"hya","ヒュ":"hyu","ヒョ":"hyo",
  "ミャ":"mya","ミュ":"myu","ミョ":"myo",
  "リャ":"rya","リュ":"ryu","リョ":"ryo",
  "ギャ":"gya","ギュ":"gyu","ギョ":"gyo",
  "ジャ":"ja","ジュ":"ju","ジョ":"jo",
  "ビャ":"bya","ビュ":"byu","ビョ":"byo",
  "ピャ":"pya","ピュ":"pyu","ピョ":"pyo",
  "ッ":"",  // double consonant marker — handled below
  "ー":"-", // long vowel dash
};

export function kanaToRomaji(str) {
  let result = "";
  let i = 0;
  while (i < str.length) {
    const two = str[i] + (str[i + 1] || "");
    if (KATAKANA_TO_ROMAJI[two] !== undefined) {
      result += KATAKANA_TO_ROMAJI[two];
      i += 2;
      continue;
    }
    const ch = str[i];
    if (ch === "ッ") {
      const next = str[i + 1] || "";
      const nextRomaji = KATAKANA_TO_ROMAJI[str[i + 1] + (str[i + 2] || "")] || KATAKANA_TO_ROMAJI[next] || "";
      result += nextRomaji[0] || "";
      i++;
      continue;
    }
    // ー extends the last vowel
    if (ch === "ー") {
      const lastChar = result[result.length - 1];
      if (lastChar && "aeiou".includes(lastChar)) {
        result += lastChar;
      }
      i++;
      continue;
    }
    result += KATAKANA_TO_ROMAJI[ch] ?? ch;
    i++;
  }
  return result;
}