import NepaliDate from "nepali-datetime";

function tryParse(label: string, value: string, format = "YYYY-MM-DD") {
  try {
    const d = new NepaliDate(value, format);
    console.log(`${label}: OK -> ${d.format("YYYY-MM-DD")}`);
    return d;
  } catch (e) {
    console.log(`${label}: THROWS -> ${(e as Error).message}`);
    return null;
  }
}

console.log("min supported", NepaliDate.minSupportedNepaliDate()?.format("YYYY-MM-DD"));
console.log("max supported", NepaliDate.maxSupportedNepaliDate()?.format("YYYY-MM-DD"));
console.log("days 2083-03 (Ashadh)", NepaliDate.getDaysOfMonth(2083, 3));
console.log("days 2082-01 (Baisakh)", NepaliDate.getDaysOfMonth(2082, 1));
tryParse("2083-03-32", "2083-03-32");
tryParse("2083-03-33", "2083-03-33");
tryParse("2082-01-32", "2082-01-32");
tryParse("2081-Garbage", "2081-01-00");
tryParse("out-of-range", "1999-12-30");
tryParse("future-edge", "2099-12-30");