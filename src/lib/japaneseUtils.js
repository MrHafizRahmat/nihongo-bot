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


// ─── KANA → ROMAJI CONVERTER ─────────────────────────────────────────────────
// Uses kuromoji to tokenize, then maps each token's reading (katakana) to romaji.
// Falls back gracefully if kuromoji is unavailable.

let _tokenizer = null;
let _loading   = false;
let _callbacks = [];

// function loadTokenizer() {
//   return new Promise((resolve, reject) => {
//     if (_tokenizer) { resolve(_tokenizer); return; }
//     if (_loading) { _callbacks.push({ resolve, reject }); return; }

//     _loading = true;
//     _callbacks.push({ resolve, reject });

//     const script = document.createElement("script");
//     script.src = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js";
//     script.onload = () => {
//       window.kuromoji
//         .builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict" })
//         .build((err, tokenizer) => {
//           if (err) {
//             _callbacks.forEach(cb => cb.reject(err));
//             _callbacks = [];
//             _loading = false;
//             return;
//           }
//           _tokenizer = tokenizer;
//           _loading = false;
//           _callbacks.forEach(cb => cb.resolve(tokenizer));
//           _callbacks = [];
//         });
//     };
//     script.onerror = (e) => {
//       _callbacks.forEach(cb => cb.reject(e));
//       _callbacks = [];
//       _loading = false;
//     };
//     document.head.appendChild(script);
//   });
// }

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

function katakanaToRomaji(str) {
  let result = "";
  let i = 0;
  while (i < str.length) {
    // Try two-char combo first (e.g. キャ)
    const two = str.slice(i, i + 2);
    if (KATAKANA_ROMAJI[two] !== undefined) {
      result += KATAKANA_ROMAJI[two];
      i += 2;
      continue;
    }
    const one = str[i];
    if (one === "ッ") {
      // Double the next consonant
      const next = str[i + 1];
      const nextRomaji = KATAKANA_ROMAJI[str.slice(i + 1, i + 3)] || KATAKANA_ROMAJI[next] || "";
      result += nextRomaji ? nextRomaji[0] : "";
      i++;
      continue;
    }
    result += KATAKANA_ROMAJI[one] ?? one;
    i++;
  }
  return result;
}

// Converts a Japanese string to romaji using kuromoji token readings.
// Falls back to returning the original string if conversion fails.
// export async function toRomaji(text) {
//   if (!text) return text;

//   try {
//     const tokenizer = await loadTokenizer();
//     const tokens = tokenizer.tokenize(text);

//     return tokens.map(token => {
//       const surface = token.surface_form;
//       // Only convert if the token contains katakana
//       const hasKatakana = /[\u30A1-\u30F6]/.test(surface);
//       if (hasKatakana && token.reading) {
//         return katakanaToRomaji(token.reading);
//       }
//       return surface;
//     }).join("");

//   } catch (err) {
//     console.warn("Kuromoji romaji conversion failed, using original text:", err);
//     return text;
//   }
// }

// Pre-warm the tokenizer on app load so first conversion isn't slow
export function prewarmTokenizer() {
  // loadTokenizer().catch(() => {});
}