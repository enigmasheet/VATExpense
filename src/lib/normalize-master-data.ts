/**
 * Master-data normalization utilities for CSV import.
 *
 * Raw CSV values go through these functions before being stored as display
 * names, ensuring consistent Title Case and correct spelling across all
 * master data created via import.
 */

// ── Title Case ──────────────────────────────────────────────────────

/** Words that should remain lowercase unless they are the first word */
const LOWERCASE_WORDS = new Set([
  "and",
  "of",
  "the",
  "for",
  "or",
  "in",
  "on",
  "at",
  "to",
  "a",
  "an",
  "by",
  "from",
  "with",
]);

/** Converts a string to Title Case: first letter of each word uppercase, rest lowercase. */
export function titleCase(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (i === 0 || !LOWERCASE_WORDS.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}

// ── Party Aliases ───────────────────────────────────────────────────

/**
 * Known party-name aliases: maps raw lowercase variants to their
 * canonical Title Case form. Matched case-insensitively against the
 * raw CSV value after trimming.
 */
const PARTY_ALIASES: Record<string, string> = {
  // Shree Durga Oils
  "shree durga oils": "Shree Durga Oils",
  "shree duga oils": "Shree Durga Oils",
  "SHREE DURGA OILS": "Shree Durga Oils",
  "SHREE DUGA OILS": "Shree Durga Oils",

  // Baishno Oil Stores
  "baishano oil stores": "Baishno Oil Stores",
  "baishno oil stores": "Baishno Oil Stores",
  "bishano oil stores": "Baishno Oil Stores",
  "BAISHNO OIL STORES": "Baishno Oil Stores",
  "BAISHANO OIL STORES": "Baishno Oil Stores",
  "BISHANO OIL STORES": "Baishno Oil Stores",

  // Pashupati Auto Mobile Center Pvt Ltd
  "pashupati auto mobile center pvt ltd": "Pashupati Auto Mobile Center Pvt Ltd",
  "pashupati auto mobiles center pvt ltd": "Pashupati Auto Mobile Center Pvt Ltd",
  "PASHUPATI AUTO MOBILE CENTER PVT LTD": "Pashupati Auto Mobile Center Pvt Ltd",
  "PASHUPATI AUTO MOBILES CENTER PVT LTD": "Pashupati Auto Mobile Center Pvt Ltd",

  // Worldlink Communications Ltd
  "worldlink communications ltd": "Worldlink Communications Ltd",
  "world link communications ltd": "Worldlink Communications Ltd",
  "worldlink communication ltd": "Worldlink Communications Ltd",
  "world link communication ltd": "Worldlink Communications Ltd",
  "woldlink communication ltd": "Worldlink Communications Ltd",
  "WORLDLINK COMMUNICATIONS LTD": "Worldlink Communications Ltd",
  "WORLDLINK COMMUNICATION LTD": "Worldlink Communications Ltd",
  "WORLD LINK COMMUNICATIONS LTD": "Worldlink Communications Ltd",
  "WORLD LINK COMMUNICATION LTD": "Worldlink Communications Ltd",
  "WOLDLINK COMMUNICATION LTD": "Worldlink Communications Ltd",

  // Asia Fuel Center Pvt Ltd
  "asia fuel center pvt ltd": "Asia Fuel Center Pvt Ltd",
  "ASIA FUEL CENTER PVT LTD": "Asia Fuel Center Pvt Ltd",

  // Godawari Oil and Lubricants Pvt Ltd
  "godawari oil and lubricants pvt ltd": "Godawari Oil and Lubricants Pvt Ltd",
  "GODAWARI OIL AND LUBRICANTS PVT LTD": "Godawari Oil and Lubricants Pvt Ltd",

  // Nepal Fuel Center Pvt Ltd
  "nepal fuel center pvt ltd": "Nepal Fuel Center Pvt Ltd",
  "NEPAL FUEL CENTER PVT LTD": "Nepal Fuel Center Pvt Ltd",

  // Dinbandhu Oil and Trading House
  "dinbandhu oil and trading house": "Dinbandhu Oil and Trading House",
  "DINBANDHU OIL AND TRADING HOUSE": "Dinbandhu Oil and Trading House",

  // Tyre Emporium
  "tyre emporium": "Tyre Emporium",
  "tyre imporium": "Tyre Emporium",
  "TYRE EMPORIUM": "Tyre Emporium",
  "TYRE IMPORIUM": "Tyre Emporium",

  // Pintu Laxmi Enterprises
  "pintu laxmi enterprices": "Pintu Laxmi Enterprises",
  "pintu laxmi enterprises": "Pintu Laxmi Enterprises",
  "PINTU LAXMI ENTERPRICES": "Pintu Laxmi Enterprises",
  "PINTU LAXMI ENTERPRISES": "Pintu Laxmi Enterprises",

  // Ganesh Servicing Station
  "ganesh servicing station": "Ganesh Servicing Station",
  "GANESH SERVICING STATION": "Ganesh Servicing Station",

  // Shivam Oil Center
  "shivam oil center": "Shivam Oil Center",
  "SHIVAM OIL CENTER": "Shivam Oil Center",

  // Shree Oil Distributer
  "shree oil distributer": "Shree Oil Distributer",
  "SHREE OIL DISTRIBUTER": "Shree Oil Distributer",

  // New Barsha Motor Parts
  "new barsha motor parts": "New Barsha Motor Parts",
  "NEW BARSHA MOTOR PARTS": "New Barsha Motor Parts",

  // Bhagat Traders
  "bhagat traders": "Bhagat Traders",
  "BHAGAT TRADERS": "Bhagat Traders",

  // Prasant Overseas
  "prasant overseas": "Prasant Overseas",
  "PRASANT OVERSEAS": "Prasant Overseas",

  // Hanuman Hardware
  "hanuman hardware": "Hanuman Hardware",
  "HANUMAN HARDWARE": "Hanuman Hardware",

  // Renuka Oil Stores
  "renuka oil stores": "Renuka Oil Stores",
  "RENUKA OIL STORES": "Renuka Oil Stores",

  // Battery Ghar
  "battery ghar": "Battery Ghar",
  "BATTERY GHAR": "Battery Ghar",

  // Bol Bom Petrol Pump
  "bol bom petrol pump": "Bol Bom Petrol Pump",
  "BOL BOM PETROL PUMP": "Bol Bom Petrol Pump",

  // Pathivara Petrol Pump
  "pathivara petrol pump": "Pathivara Petrol Pump",
  "PATHIVARA PETROL PUMP": "Pathivara Petrol Pump",
};

// ── Item Aliases ────────────────────────────────────────────────────

const ITEM_ALIASES: Record<string, string> = {
  diesel: "Diesel",
  disel: "Diesel",
  hsd: "Diesel",
  petrol: "Petrol",
  per: "Petrol",
  pms: "Petrol",
  mobil: "Mobil",
  internet: "Internet",
  parts: "Parts",
  spare: "Parts",
  tyre: "Tyre",
  tire: "Tyre",
  battery: "Battery",
  pliers: "Pliers",
  tube: "Tube",
};

// ── Public API ──────────────────────────────────────────────────────

/**
 * Normalizes a raw party name from CSV to its canonical Title Case form.
 * Checks against known aliases first; falls back to generic Title Case.
 */
export function normalizePartyName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Exact alias match (case-insensitive)
  const alias = PARTY_ALIASES[trimmed] ?? PARTY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  // Generic Title Case
  return titleCase(trimmed);
}

/**
 * Normalizes a raw location name from CSV to Title Case.
 */
export function normalizeLocationName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return titleCase(trimmed);
}

/**
 * Normalizes a raw item/description name from CSV.
 * Checks against known aliases first; falls back to Title Case.
 */
export function normalizeItemName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const alias = ITEM_ALIASES[lower];
  if (alias) return alias;
  return titleCase(trimmed);
}
