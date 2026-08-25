import { describe, it, expect } from "vitest";
import { ledgerReducer } from "../ledger-reducer";
import { createLedgerRow } from "../ledger-utils";
import type { LedgerRow } from "../ledger-types";

function makeRow(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return { ...createLedgerRow(), id: "test-row-1", ...overrides };
}

describe("ledgerReducer", () => {
  describe("UPDATE_FIELD", () => {
    it("updates a text field", () => {
      const rows = [makeRow()];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "miti",
        value: "2080-04-01",
      });
      expect(result[0].miti).toBe("2080-04-01");
    });

    it("auto-calculates VAT and total from taxableAmount", () => {
      const rows = [makeRow()];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "taxableAmount",
        value: "1000",
      });
      expect(result[0].vatAmount).toBe("130");
      expect(result[0].totalAmount).toBe("1130");
    });

    it("clears VAT and total when taxableAmount is 0", () => {
      const rows = [makeRow({ taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "taxableAmount",
        value: "0",
      });
      expect(result[0].vatAmount).toBe("");
      expect(result[0].totalAmount).toBe("");
    });

    it("clears VAT and total when taxableAmount is empty", () => {
      const rows = [makeRow({ taxableAmount: "1000", vatAmount: "130", totalAmount: "1130" })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "taxableAmount",
        value: "",
      });
      expect(result[0].vatAmount).toBe("");
      expect(result[0].totalAmount).toBe("");
    });

    it("auto-calculates taxable and VAT from totalAmount", () => {
      const rows = [makeRow()];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "totalAmount",
        value: "1130",
      });
      expect(result[0].taxableAmount).toBe("1000");
      expect(result[0].vatAmount).toBe("130");
    });

    it("clears taxable and VAT when totalAmount is 0", () => {
      const rows = [makeRow({ totalAmount: "1130", taxableAmount: "1000", vatAmount: "130" })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "totalAmount",
        value: "0",
      });
      expect(result[0].taxableAmount).toBe("");
      expect(result[0].vatAmount).toBe("");
    });

    it("updates categoryId with categoryName", () => {
      const rows = [makeRow()];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "categoryId",
        value: "cat-1",
        categoryName: "Office",
      });
      expect(result[0].categoryId).toBe("cat-1");
      expect(result[0].categoryName).toBe("Office");
    });

    it("clears terminal status to pending", () => {
      const rows = [makeRow({ status: "saved" })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "miti",
        value: "2080-04-01",
      });
      expect(result[0].status).toBe("pending");
    });

    it("clears error status to pending", () => {
      const rows = [makeRow({ status: "error", error: "some error" })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "test-row-1",
        field: "miti",
        value: "2080-04-01",
      });
      expect(result[0].status).toBe("pending");
      expect(result[0].error).toBeUndefined();
    });

    it("does not change status of other rows", () => {
      const rows = [makeRow({ id: "row-1" }), makeRow({ id: "row-2", status: "saved" })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_FIELD",
        rowId: "row-1",
        field: "miti",
        value: "2080-04-01",
      });
      expect(result[1].status).toBe("saved");
    });
  });

  describe("SELECT_PARTY", () => {
    it("sets party details and marks resolved", () => {
      const rows = [makeRow()];
      const result = ledgerReducer(rows, {
        type: "SELECT_PARTY",
        rowId: "test-row-1",
        partyId: "p1",
        partyName: "Acme Corp",
        locationId: "loc-1",
        locationName: "Kathmandu",
      });
      expect(result[0].partyId).toBe("p1");
      expect(result[0].partyName).toBe("Acme Corp");
      expect(result[0].partyResolved).toBe(true);
      expect(result[0].locationId).toBe("loc-1");
      expect(result[0].locationName).toBe("Kathmandu");
    });
  });

  describe("UPDATE_PARTY_SEARCH", () => {
    it("marks resolved when partyId provided", () => {
      const rows = [makeRow()];
      const result = ledgerReducer(rows, {
        type: "UPDATE_PARTY_SEARCH",
        rowId: "test-row-1",
        partyName: "Acme",
        partyId: "p1",
        locationId: "loc-1",
        locationName: "Kathmandu",
      });
      expect(result[0].partyResolved).toBe(true);
      expect(result[0].partyId).toBe("p1");
    });

    it("marks unresolved when no partyId", () => {
      const rows = [makeRow({ partyId: "p1", partyResolved: true })];
      const result = ledgerReducer(rows, {
        type: "UPDATE_PARTY_SEARCH",
        rowId: "test-row-1",
        partyName: "Acme",
      });
      expect(result[0].partyResolved).toBe(false);
      expect(result[0].partyId).toBe("");
      expect(result[0].locationId).toBeNull();
    });
  });

  describe("ADD_ROW", () => {
    it("appends at end when no afterId", () => {
      const rows = [makeRow({ id: "row-1" })];
      const newRow = makeRow({ id: "new-row" });
      const result = ledgerReducer(rows, { type: "ADD_ROW", newRow });
      expect(result).toHaveLength(2);
      expect(result[1].id).toBe("new-row");
    });

    it("inserts after specified row", () => {
      const rows = [makeRow({ id: "row-1" }), makeRow({ id: "row-2" })];
      const newRow = makeRow({ id: "new-row" });
      const result = ledgerReducer(rows, { type: "ADD_ROW", afterId: "row-1", newRow });
      expect(result).toHaveLength(3);
      expect(result[1].id).toBe("new-row");
    });

    it("inserts at index 0 when afterId not found", () => {
      const rows = [makeRow({ id: "row-1" })];
      const newRow = makeRow({ id: "new-row" });
      const result = ledgerReducer(rows, { type: "ADD_ROW", afterId: "nonexistent", newRow });
      expect(result[0].id).toBe("new-row");
    });
  });

  describe("REMOVE_ROW", () => {
    it("removes specified row", () => {
      const rows = [makeRow({ id: "row-1" }), makeRow({ id: "row-2" })];
      const result = ledgerReducer(rows, { type: "REMOVE_ROW", rowId: "row-1" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("row-2");
    });

    it("returns single empty row when removing last row", () => {
      const rows = [makeRow({ id: "row-1" })];
      const result = ledgerReducer(rows, { type: "REMOVE_ROW", rowId: "row-1" });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("incomplete");
    });
  });

  describe("DUPLICATE_ROW", () => {
    it("inserts new row after source index", () => {
      const rows = [makeRow({ id: "row-1" }), makeRow({ id: "row-2" })];
      const newRow = makeRow({ id: "new-row" });
      const result = ledgerReducer(rows, { type: "DUPLICATE_ROW", newRow, sourceIdx: 0 });
      expect(result).toHaveLength(3);
      expect(result[1].id).toBe("new-row");
    });
  });

  describe("RESET_STATUS", () => {
    it("resets error row to pending", () => {
      const rows = [makeRow({ status: "error", error: "some error" })];
      const result = ledgerReducer(rows, { type: "RESET_STATUS", rowId: "test-row-1" });
      expect(result[0].status).toBe("pending");
      expect(result[0].error).toBeUndefined();
    });
  });

  describe("CLEAR_SAVED", () => {
    it("removes only saved rows", () => {
      const rows = [
        makeRow({ id: "r1", status: "saved" }),
        makeRow({ id: "r2", status: "error" }),
        makeRow({ id: "r3", status: "pending" }),
      ];
      const result = ledgerReducer(rows, { type: "CLEAR_SAVED" });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["r2", "r3"]);
    });
  });

  describe("MARK_PENDING_AS_SAVING", () => {
    it("transitions only pending rows to saving", () => {
      const rows = [
        makeRow({ id: "r1", status: "pending" }),
        makeRow({ id: "r2", status: "saved" }),
        makeRow({ id: "r3", status: "error" }),
      ];
      const result = ledgerReducer(rows, { type: "MARK_PENDING_AS_SAVING" });
      expect(result[0].status).toBe("saving");
      expect(result[1].status).toBe("saved");
      expect(result[2].status).toBe("error");
    });
  });

  describe("MARK_SAVING_AS_ERROR", () => {
    it("transitions only saving rows to error", () => {
      const rows = [
        makeRow({ id: "r1", status: "saving" }),
        makeRow({ id: "r2", status: "pending" }),
      ];
      const result = ledgerReducer(rows, { type: "MARK_SAVING_AS_ERROR", error: "DB failed" });
      expect(result[0].status).toBe("error");
      expect(result[0].error).toBe("DB failed");
      expect(result[1].status).toBe("pending");
    });
  });

  describe("SET_ROW_RESULT", () => {
    it("sets saved status with no error", () => {
      const rows = [makeRow({ status: "saving" })];
      const result = ledgerReducer(rows, {
        type: "SET_ROW_RESULT",
        rowId: "test-row-1",
        status: "saved",
      });
      expect(result[0].status).toBe("saved");
      expect(result[0].error).toBeUndefined();
    });

    it("sets error status with message", () => {
      const rows = [makeRow({ status: "saving" })];
      const result = ledgerReducer(rows, {
        type: "SET_ROW_RESULT",
        rowId: "test-row-1",
        status: "error",
        error: "Duplicate",
      });
      expect(result[0].status).toBe("error");
      expect(result[0].error).toBe("Duplicate");
    });
  });

  describe("APPLY_SAVE_RESULTS", () => {
    it("applies results to matching rows", () => {
      const rows = [
        makeRow({ id: "r1", status: "saving" }),
        makeRow({ id: "r2", status: "saving" }),
      ];
      const result = ledgerReducer(rows, {
        type: "APPLY_SAVE_RESULTS",
        results: [
          { rowId: "r1", ok: true },
          { rowId: "r2", ok: false, error: "Duplicate" },
        ],
      });
      expect(result[0].status).toBe("saved");
      expect(result[1].status).toBe("error");
      expect(result[1].error).toBe("Duplicate");
    });

    it("leaves unmatched rows unchanged", () => {
      const rows = [makeRow({ id: "r1", status: "pending" })];
      const result = ledgerReducer(rows, {
        type: "APPLY_SAVE_RESULTS",
        results: [{ rowId: "r2", ok: true }],
      });
      expect(result[0].status).toBe("pending");
    });
  });

  describe("RESET_ROWS", () => {
    it("replaces entire state", () => {
      const rows = [makeRow({ id: "old" })];
      const newRows = [makeRow({ id: "new" })];
      const result = ledgerReducer(rows, { type: "RESET_ROWS", rows: newRows });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("new");
    });
  });

  describe("AUTO_FIX", () => {
    it("does not change row when status is saving", () => {
      const rows = [makeRow({ id: "r1", status: "saving", miti: "2080-04-01" })];
      const result = ledgerReducer(rows, {
        type: "AUTO_FIX",
        rowId: "r1",
        fixType: "fillTodayMiti",
        value: "2083-10-15",
      });
      expect(result[0].miti).toBe("2080-04-01");
      expect(result[0].status).toBe("saving");
    });

    it("applies fix when status is not saving", () => {
      const rows = [makeRow({ id: "r1", status: "error", miti: "" })];
      const result = ledgerReducer(rows, {
        type: "AUTO_FIX",
        rowId: "r1",
        fixType: "fillTodayMiti",
        value: "2083-10-15",
      });
      expect(result[0].miti).toBe("2083-10-15");
      expect(result[0].status).toBe("pending");
    });
  });
});
