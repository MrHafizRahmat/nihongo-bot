// ─── RESPONSE PARSER ─────────────────────────────────────────────────────────
// Parses the structured [JAPANESE] / [ROMAJI] / [NOTE] block format
// returned by the AI into a clean object for rendering.

export function parseResponse(raw) {
  const extract = (tag, text) => {
    // Strict match first
    const strict = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\s*\\/\\s*${tag}\\s*\\]`, "i");
    const strictMatch = text.match(strict);
    if (strictMatch) return strictMatch[1].trim();

    // Fuzzy match — closing tag starts with [/ and contains most of the tag name
    // Handles typos like [/JAPANEI], [/ROMAJ], [/NOT], etc.
    const fuzzy = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\s*\\/[A-Z_\\s]{1,10}\\]`, "i");
    const fuzzyMatch = text.match(fuzzy);
    if (fuzzyMatch) return fuzzyMatch[1].trim();

    // Fallback — grab everything after [TAG] to end of string
    const loose = new RegExp(`\\[${tag}\\]([\\s\\S]*)$`, "i");
    const looseMatch = text.match(loose);
    return looseMatch ? looseMatch[1].trim() : null;
  };

  const japanese = extract("JAPANESE", raw);
  const romaji   = extract("ROMAJI", raw);
  const note     = extract("NOTE", raw);

  // If the response doesn't follow the format at all, treat it as a plain note
  if (!japanese && !romaji && !note) {
    return { japanese: null, romaji: null, note: raw.trim(), raw };
  }

  return { japanese, romaji, note, raw };
}


// ─── KANJI → HIRAGANA CONVERTER ──────────────────────────────────────────────
// Uses the kuromoji tokenizer (loaded via CDN) to convert any kanji in a
// Japanese string into hiragana readings. Falls back gracefully if unavailable.

let _tokenizer = null;
let _loading   = false;
let _callbacks = [];

function loadTokenizer() {
  return new Promise((resolve, reject) => {
    if (_tokenizer) { resolve(_tokenizer); return; }
    if (_loading) { _callbacks.push({ resolve, reject }); return; }

    _loading = true;
    _callbacks.push({ resolve, reject });

    // Dynamically load kuromoji from CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js";
    script.onload = () => {
      window.kuromoji
        .builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict" })
        .build((err, tokenizer) => {
          if (err) {
            _callbacks.forEach(cb => cb.reject(err));
            _callbacks = [];
            _loading = false;
            return;
          }
          _tokenizer = tokenizer;
          _loading = false;
          _callbacks.forEach(cb => cb.resolve(tokenizer));
          _callbacks = [];
        });
    };
    script.onerror = (e) => {
      _callbacks.forEach(cb => cb.reject(e));
      _callbacks = [];
      _loading = false;
    };
    document.head.appendChild(script);
  });
}

// Converts kanji in a string to hiragana using kuromoji token readings.
// Also converts any katakana to hiragana.
// Returns the original string if conversion fails.
export async function toHiragana(text) {
  if (!text) return text;

  // First convert any katakana → hiragana (no tokenizer needed)
  let result = katakanaToHiragana(text);

  // Then check if kanji remain — if not, skip tokenizer entirely
  const hasKanji = /[\u4e00-\u9faf\u3400-\u4dbf]/.test(result);
  if (!hasKanji) return result;

  try {
    const tokenizer = await loadTokenizer();
    const tokens = tokenizer.tokenize(result);

    return tokens.map(token => {
      if (token.reading) {
        return katakanaToHiragana(token.reading);
      }
      return token.surface_form;
    }).join("");

  } catch (err) {
    console.warn("Kuromoji conversion failed, using original text:", err);
    return result;
  }
}

// Converts a katakana string to hiragana
function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// Pre-warm the tokenizer on app load so first message isn't slow
export function prewarmTokenizer() {
  loadTokenizer().catch(() => {
    // Silent fail — conversion will just return original text
  });
}