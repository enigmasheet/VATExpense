import { describe, it, expect } from "vitest";
import {
  companyIdSchema,
  createPartySchema,
  createCategorySchema,
  createLocationSchema,
  createFiscalYearSchema,
  createTruckSchema,
  updatePartySchema,
  updateTruckSchema,
} from "../masters";
import { safeParse } from "../utils";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_UUID = "not-a-uuid";

describe("companyIdSchema", () => {
  it("accepts valid UUID", () => {
    const result = companyIdSchema.safeParse(VALID_UUID);
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = companyIdSchema.safeParse(INVALID_UUID);
    expect(result.success).toBe(false);
  });
});

describe("createPartySchema", () => {
  const validInput = {
    companyId: VALID_UUID,
    name: "Test Party",
  };

  it("accepts valid input", () => {
    const result = safeParse(createPartySchema, validInput);
    expect(result.ok).toBe(true);
  });

  it("rejects missing name", () => {
    const result = safeParse(createPartySchema, { companyId: VALID_UUID });
    expect(result.ok).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = safeParse(createPartySchema, {
      companyId: VALID_UUID,
      name: "A".repeat(201),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts null vatNumber", () => {
    const result = safeParse(createPartySchema, {
      ...validInput,
      vatNumber: null,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts null locationId", () => {
    const result = safeParse(createPartySchema, {
      ...validInput,
      locationId: null,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts valid locationId", () => {
    const result = safeParse(createPartySchema, {
      ...validInput,
      locationId: VALID_UUID,
    });
    expect(result.ok).toBe(true);
  });
});

describe("createCategorySchema", () => {
  it("accepts valid input", () => {
    const result = safeParse(createCategorySchema, {
      companyId: VALID_UUID,
      name: "Fuel",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing name", () => {
    const result = safeParse(createCategorySchema, { companyId: VALID_UUID });
    expect(result.ok).toBe(false);
  });
});

describe("createLocationSchema", () => {
  it("accepts valid input", () => {
    const result = safeParse(createLocationSchema, {
      companyId: VALID_UUID,
      name: "Kathmandu",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing name", () => {
    const result = safeParse(createLocationSchema, { companyId: VALID_UUID });
    expect(result.ok).toBe(false);
  });
});

describe("createFiscalYearSchema", () => {
  const validInput = {
    companyId: VALID_UUID,
    name: "2080/81",
    startYear: 2080,
    endYear: 2081,
  };

  it("accepts valid input", () => {
    const result = safeParse(createFiscalYearSchema, validInput);
    expect(result.ok).toBe(true);
  });

  it("rejects endYear <= startYear", () => {
    const result = safeParse(createFiscalYearSchema, {
      ...validInput,
      startYear: 2081,
      endYear: 2080,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing name", () => {
    const result = safeParse(createFiscalYearSchema, {
      companyId: VALID_UUID,
      startYear: 2080,
      endYear: 2081,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects startYear below minimum", () => {
    const result = safeParse(createFiscalYearSchema, {
      ...validInput,
      startYear: 1999,
    });
    expect(result.ok).toBe(false);
  });
});

describe("updatePartySchema", () => {
  it("accepts partial update with name only", () => {
    const result = safeParse(updatePartySchema, { name: "New Name" });
    expect(result.ok).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = safeParse(updatePartySchema, {});
    expect(result.ok).toBe(true);
  });

  it("accepts valid isActive boolean", () => {
    const result = safeParse(updatePartySchema, { isActive: false });
    expect(result.ok).toBe(true);
  });

  it("accepts null vatNumber", () => {
    const result = safeParse(updatePartySchema, { vatNumber: null });
    expect(result.ok).toBe(true);
  });
});

describe("createTruckSchema", () => {
  const validInput = {
    companyId: VALID_UUID,
    name: "Na 1 2345",
  };

  it("accepts valid input with only required fields", () => {
    const result = safeParse(createTruckSchema, validInput);
    expect(result.ok).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = safeParse(createTruckSchema, {
      ...validInput,
      ownerName: "Ram Shrestha",
      truckType: "Container",
      isActive: true,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing name", () => {
    const result = safeParse(createTruckSchema, { companyId: VALID_UUID });
    expect(result.ok).toBe(false);
  });

  it("rejects empty name", () => {
    const result = safeParse(createTruckSchema, { companyId: VALID_UUID, name: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects name exceeding max length", () => {
    const result = safeParse(createTruckSchema, {
      companyId: VALID_UUID,
      name: "A".repeat(201),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts null ownerName", () => {
    const result = safeParse(createTruckSchema, {
      ...validInput,
      ownerName: null,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts null truckType", () => {
    const result = safeParse(createTruckSchema, {
      ...validInput,
      truckType: null,
    });
    expect(result.ok).toBe(true);
  });
});

describe("updateTruckSchema", () => {
  it("accepts partial update with name only", () => {
    const result = safeParse(updateTruckSchema, { name: "Na 2 9999" });
    expect(result.ok).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = safeParse(updateTruckSchema, {});
    expect(result.ok).toBe(true);
  });

  it("accepts valid isActive boolean", () => {
    const result = safeParse(updateTruckSchema, { isActive: false });
    expect(result.ok).toBe(true);
  });

  it("accepts null ownerName", () => {
    const result = safeParse(updateTruckSchema, { ownerName: null });
    expect(result.ok).toBe(true);
  });

  it("accepts null truckType", () => {
    const result = safeParse(updateTruckSchema, { truckType: null });
    expect(result.ok).toBe(true);
  });

  it("rejects empty name string", () => {
    const result = safeParse(updateTruckSchema, { name: "" });
    expect(result.ok).toBe(false);
  });
});
