import { db } from "../src/lib/db";
import { companies, fiscalYears, locations, categories, parties, expenses, users } from "../src/lib/db/schema";
import { parseMiti } from "../src/lib/nepali-date";
import { normalizeName } from "../src/lib/normalize";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function getOrCreateCompany() {
  const existing = await db.select().from(companies).where(eq(companies.name, "AB Carriers")).limit(1);
  if (existing.length > 0) return existing[0];

  const [company] = await db
    .insert(companies)
    .values({
      name: "AB Carriers",
      defaultVatRate: "13.00",
    })
    .returning();
  return company;
}

async function getOrCreateUser(companyId: string) {
  const existing = await db.select().from(users).where(eq(users.email, "admin@gmail.com")).limit(1);
  if (existing.length > 0) return existing[0];

  const passwordHash = await bcrypt.hash("admin123", 10);
  const [user] = await db
    .insert(users)
    .values({
      companyId,
      email: "admin@gmail.com",
      name: "Admin",
      passwordHash,
      role: "Admin",
    })
    .returning();
  console.log("Created admin user: admin@gmail.com / admin123");
  return user;
}

async function getOrCreateFiscalYear(companyId: string, data: { name: string; startYear: number; endYear: number; isActive: boolean }) {
  const existing = await db
    .select()
    .from(fiscalYears)
    .where(and(eq(fiscalYears.companyId, companyId), eq(fiscalYears.name, data.name)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const [fy] = await db.insert(fiscalYears).values({ companyId, ...data }).returning();
  return fy;
}

async function getOrCreateLocation(companyId: string, name: string) {
  const normalizedName = normalizeName(name);
  const existing = await db
    .select()
    .from(locations)
    .where(and(eq(locations.companyId, companyId), eq(locations.normalizedName, normalizedName)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(locations).values({ companyId, name, normalizedName }).returning();
  return created;
}

async function getOrCreateCategory(companyId: string, name: string) {
  const normalizedName = normalizeName(name);
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.companyId, companyId), eq(categories.normalizedName, normalizedName)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(categories).values({ companyId, name, normalizedName }).returning();
  return created;
}

async function getOrCreateParty(companyId: string, data: { name: string; vatNumber: string | null; locationId: string | null }) {
  const normalizedName = normalizeName(data.name);
  const existing = await db
    .select()
    .from(parties)
    .where(and(eq(parties.companyId, companyId), eq(parties.normalizedName, normalizedName)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const normalizedVat = data.vatNumber ? data.vatNumber.replace(/\D/g, "") : null;
  const [created] = await db
    .insert(parties)
    .values({
      companyId,
      name: data.name,
      normalizedName,
      vatNumber: data.vatNumber,
      normalizedVatNumber: normalizedVat,
      locationId: data.locationId,
    })
    .returning();
  return created;
}

const EXPENSE_SEEDS = [
  { miti: "01/10/2082", invoice: "7104", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "81.79", rate: "119.026", taxable: "9735.14", vat: "1265.57", total: "11001" },
  { miti: "04/10/2082", invoice: "2503", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "70.92", rate: "118.53982", taxable: "8406.84", vat: "1092.89", total: "9500" },
  { miti: "04/10/2082", invoice: "1814", party: "tyre emporium", location: "birgunj", vatNo: "300034592", item: "tyre", qty: "3", rate: null, taxable: "29203.54", vat: "3796.46", total: "33000" },
  { miti: "04/10/2082", invoice: "2357", party: "renuka oil stores", location: "birgunj", vatNo: "300658299", item: "diesel", qty: "7.49", rate: "118.1416", taxable: "884.88", vat: "115.03", total: "1000" },
  { miti: "04/10/2082", invoice: "7238", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "90", rate: "118.142", taxable: "10632.78", vat: "1382.26", total: "12015" },
  { miti: "06/10/2082", invoice: "8465", party: "purwanchal oil supplayers", location: "biratnagar", vatNo: "300069406", item: "diesel", qty: "44.94", rate: "118.15", taxable: "5309.66", vat: "690.26", total: "6000" },
  { miti: "07/10/2082", invoice: "7358", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "149.81", rate: "118.142", taxable: "17698.85", vat: "2300.85", total: "20000" },
  { miti: "07/10/2082", invoice: "7378", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "90", rate: "118.142", taxable: "10632.78", vat: "1382.26", total: "12015" },
  { miti: "07/10/2082", invoice: "2624", party: "chitra oil stores", location: "lalgadh", vatNo: "607864492", item: "diesel", qty: "14.98", rate: "118.14159", taxable: "1769.76", vat: "230.07", total: "2000" },
  { miti: "08/10/2082", invoice: "2550", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "70.92", rate: "118.53982", taxable: "8406.84", vat: "1092.89", total: "9500" },
  { miti: "11/10/2082", invoice: "7520", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "90", rate: "118.142", taxable: "10632.78", vat: "1382.26", total: "12015" },
  { miti: "13/10/2082", invoice: "2593", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "74.65", rate: "118.53982", taxable: "8849", vat: "1150.37", total: "9999" },
  { miti: "13/10/2082", invoice: "505", party: "new barsha motor parts", location: "birgunj", vatNo: "601235609", item: "parts", qty: null, rate: null, taxable: "31150.45", vat: "4049.56", total: "35200" },
  { miti: "13/10/2082", invoice: "7606", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "100", rate: "118.142", taxable: "11814.2", vat: "1535.85", total: "13350" },
  { miti: "15/10/2082", invoice: "3027", party: "narayani oil center", location: "inarwa", vatNo: "300960255", item: "diesel", qty: "59.72", rate: "118.54732", taxable: "7079.65", vat: "920.35", total: "8000" },
  { miti: "16/10/2082", invoice: "7717", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "247.19", rate: "118.142", taxable: "29203.52", vat: "3796.46", total: "33000" },
  { miti: "16/10/2082", invoice: "8965", party: "purwanchal oil supplayers", location: "biratnagar", vatNo: "300069406", item: "diesel", qty: "119.85", rate: "118.14", taxable: "14159.08", vat: "1840.68", total: "16000" },
  { miti: "16/10/2082", invoice: "2660163", party: "worldlink communication ltd", location: "lalitpur", vatNo: "300073250", item: "internet", qty: null, rate: null, taxable: "1250", vat: "162.5", total: "1413" },
  { miti: "16/10/2082", invoice: "2660177", party: "worldlink communication ltd", location: "lalitpur", vatNo: "300073250", item: "internet", qty: null, rate: null, taxable: "1300", vat: "169", total: "1469" },
  { miti: "18/10/2082", invoice: "9076", party: "purwanchal oil supplayers", location: "biratnagar", vatNo: "300069406", item: "diesel", qty: "58.61", rate: "120.79", taxable: "7079.5", vat: "920.34", total: "8000" },
  { miti: "19/10/2082", invoice: "2653", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "69.37", rate: "121.19469", taxable: "8407.28", vat: "1092.95", total: "9500" },
  { miti: "19/10/2082", invoice: "7851", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "80.59", rate: "120.797", taxable: "9735.03", vat: "1265.55", total: "11001" },
  { miti: "21/10/2082", invoice: "34", party: "durga bhawani trading", location: "birgunj", vatNo: "608609557", item: "parts", qty: null, rate: null, taxable: "1899.58", vat: "246.95", total: "2147" },
  { miti: "21/10/2082", invoice: "980", party: "pashupati auto mobiles center pvt ltd", location: "birgunj", vatNo: "300661590", item: "diesel", qty: "200", rate: "120.79646", taxable: "24159.29", vat: "3140.71", total: "27300" },
  { miti: "22/10/2082", invoice: "2687", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "58.42", rate: "121.19469", taxable: "7080.19", vat: "920.42", total: "8001" },
  { miti: "22/10/2082", invoice: "2683", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "69.37", rate: "121.19469", taxable: "8407.28", vat: "1092.95", total: "9500" },
  { miti: "22/10/2082", invoice: "7982", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "80.59", rate: "120.797", taxable: "9735.03", vat: "1265.55", total: "11001" },
  { miti: "23/10/2082", invoice: "989", party: "pashupati auto mobiles center pvt ltd", location: "birgunj", vatNo: "300661590", item: "diesel", qty: "200", rate: "120.79646", taxable: "24159.29", vat: "3140.71", total: "27300" },
  { miti: "24/10/2082", invoice: "414", party: "country inn hotel pvt ltd", location: "birgunj", vatNo: "304517457", item: "room", qty: "7", rate: "1200", taxable: "8400", vat: "1092", total: "9492" },
  { miti: "25/10/2082", invoice: "8062", party: "shree durga oils", location: "birgunj", vatNo: "303927983", item: "diesel", qty: "161.17", rate: "120.797", taxable: "19468.85", vat: "2530.95", total: "22000" },
  { miti: "26/10/2082", invoice: "1009", party: "pashupati auto mobiles center pvt ltd", location: "birgunj", vatNo: "300661590", item: "diesel", qty: "200", rate: "120.796462", taxable: "24159.29", vat: "3140.71", total: "27300" },
  { miti: "26/10/2082", invoice: "2734", party: "baishno oils stores", location: "bhokraha", vatNo: "302154539", item: "diesel", qty: "69.37", rate: "121.19469", taxable: "8407.28", vat: "1092.95", total: "9500" },
  { miti: "28/10/2082", invoice: "9570", party: "purwanchal oil supplayers", location: "biratnagar", vatNo: "300069406", item: "diesel", qty: "58.61", rate: "120.79", taxable: "7079.5", vat: "920.34", total: "8000" },
  { miti: "29/10/2082", invoice: "1036", party: "pashupati auto mobiles center pvt ltd", location: "birgunj", vatNo: "300661590", item: "diesel", qty: "200", rate: "120.79646", taxable: "24159.29", vat: "3140.71", total: "27300" },
  { miti: "29/10/2082", invoice: "9622", party: "purwanchal oil supplayers", location: "biratnagar", vatNo: "300069406", item: "diesel", qty: "62.27", rate: "120.8", taxable: "7522.22", vat: "977.89", total: "8500" },
  { miti: "22/10/2082", invoice: "2876", party: "chitra oil stores", location: "lalgadh", vatNo: "607864492", item: "diesel", qty: "10.99", rate: "120.79646", taxable: "1327.55", vat: "172.58", total: "1500" },
];

async function main() {
  const company = await getOrCreateCompany();
  console.log(`Company: ${company.name} (${company.id})`);

  await getOrCreateUser(company.id);

  const activeFy = await getOrCreateFiscalYear(company.id, {
    name: "2082/83",
    startYear: 2082,
    endYear: 2083,
    isActive: true,
  });
  console.log(`Fiscal year: ${activeFy.name} (active)`);

  const locationNames = [...new Set(EXPENSE_SEEDS.map((s) => s.location))];
  const locationRows = new Map<string, (typeof locations.$inferSelect)>();
  for (const name of locationNames) {
    locationRows.set(name, await getOrCreateLocation(company.id, name));
  }

  const categoryNames = [...new Set(EXPENSE_SEEDS.map((s) => s.item))];
  const categoryRows = new Map<string, (typeof categories.$inferSelect)>();
  for (const name of categoryNames) {
    categoryRows.set(name, await getOrCreateCategory(company.id, name));
  }

  const partyData = new Map<string, { name: string; vatNumber: string | null; locationId: string | null }>();
  for (const seed of EXPENSE_SEEDS) {
    if (!partyData.has(seed.party)) {
      partyData.set(seed.party, {
        name: seed.party,
        vatNumber: seed.vatNo,
        locationId: locationRows.get(seed.location)?.id ?? null,
      });
    }
  }
  const partyRows = new Map<string, (typeof parties.$inferSelect)>();
  for (const [name, data] of partyData) {
    partyRows.set(name, await getOrCreateParty(company.id, data));
  }

  let createdCount = 0;
  for (const seed of EXPENSE_SEEDS) {
    const parsed = parseMiti(seed.miti);
    if (!parsed.ok) {
      console.log(`Skip invalid miti: ${seed.miti} - ${parsed.error}`);
      continue;
    }

    const party = partyRows.get(seed.party)!;
    const category = categoryRows.get(seed.item)!;
    const location = locationRows.get(seed.location) ?? null;

    const duplicate = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, company.id),
          eq(expenses.fiscalYearId, activeFy.id),
          eq(expenses.partyId, party.id),
          eq(expenses.invoiceNumber, seed.invoice),
        ),
      )
      .limit(1);

    if (duplicate.length > 0) {
      console.log(`Skip duplicate: ${seed.invoice} - ${seed.party}`);
      continue;
    }

    await db.insert(expenses).values({
      companyId: company.id,
      fiscalYearId: activeFy.id,
      partyId: party.id,
      categoryId: category.id,
      locationId: location?.id ?? null,
      miti: parsed.ok ? `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}` : seed.miti,
      nepaliMonth: parsed.monthName,
      invoiceNumber: seed.invoice,
      item: seed.item,
      quantity: seed.qty,
      rate: seed.rate,
      taxableAmount: seed.taxable,
      vatAmount: seed.vat,
      totalAmount: seed.total,
      vatRate: "13.00",
    });
    createdCount++;
  }

  console.log(`Seed complete. Created ${createdCount} expenses.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
