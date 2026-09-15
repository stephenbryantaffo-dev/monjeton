import { describe, it, expect } from "vitest";
import {
  parseJekoTransaction,
  matchProfileByPhone,
  phoneDigitVariants,
} from "../../supabase/functions/_shared/jeko-parse.ts";

describe("parseJekoTransaction", () => {
  it("parses a successful payment nested under .data", () => {
    const parsed = parseJekoTransaction({
      data: {
        id: "txn_1",
        status: "SUCCESS",
        transactionType: "PaymentRequest",
        counterpartIdentifier: "+225 07 00 00 00 00",
        amount: { amount: 2000 },
        transactionDetails: {
          paymentLinkId: "d616710c-47fb-4afc-b0e2-e9fe3e0b29ab",
          reference: "ref-1",
        },
      },
    });

    expect(parsed.status).toBe("success");
    expect(parsed.isPayment).toBe(true);
    expect(parsed.txnId).toBe("txn_1");
    expect(parsed.planName).toBe("Pro");
    expect(parsed.priceXof).toBe(2000);
    expect(parsed.amountXof).toBe(2000);
  });

  it("parses a payment with fields at the root (no .data wrapper)", () => {
    const parsed = parseJekoTransaction({
      id: "txn_2",
      status: "success",
      transactionType: "payment",
      counterpartIdentifier: "0700000000",
      amount: { amount: 500000 }, // centimes -> 5000 XOF
      transactionDetails: {
        paymentLinkId: "e7715547-b693-40dd-b06e-9bbb63a90961",
      },
    });

    expect(parsed.isPayment).toBe(true);
    expect(parsed.amountXof).toBe(5000);
    expect(parsed.planName).toBe("Ultra Pro");
    expect(parsed.priceXof).toBe(5000);
  });

  it("flags non-payment or non-success transactions as not a payment / not success", () => {
    const pending = parseJekoTransaction({
      data: { id: "txn_3", status: "pending", transactionType: "PaymentRequest" },
    });
    expect(pending.status).not.toBe("success");

    const transfer = parseJekoTransaction({
      data: { id: "txn_4", status: "success", transactionType: "Transfer" },
    });
    expect(transfer.isPayment).toBe(false);
  });

  it("handles a missing/empty payload without throwing", () => {
    expect(() => parseJekoTransaction(null)).not.toThrow();
    expect(() => parseJekoTransaction({})).not.toThrow();
    const parsed = parseJekoTransaction({});
    expect(parsed.isPayment).toBe(false);
    expect(parsed.txnId).toBe("");
  });
});

describe("phoneDigitVariants", () => {
  it("produces local and country-code variants", () => {
    const variants = phoneDigitVariants("+225 07 00 00 00 00");
    expect(variants.has("2250700000000")).toBe(true);
    expect(variants.has("0700000000")).toBe(true);
  });
});

describe("matchProfileByPhone", () => {
  const profiles = [
    { user_id: "user-a", phone: "0700000000" },
    { user_id: "user-b", phone: "+225 01 02 03 04 05" },
  ];

  it("matches a local-format number against a stored local number", () => {
    expect(matchProfileByPhone(profiles, "0700000000")).toBe("user-a");
  });

  it("matches a country-code-prefixed number against a stored local number", () => {
    expect(matchProfileByPhone(profiles, "2250700000000")).toBe("user-a");
  });

  it("matches regardless of formatting/spacing on the stored side", () => {
    expect(matchProfileByPhone(profiles, "0102030405")).toBe("user-b");
  });

  it("returns null when nothing matches", () => {
    expect(matchProfileByPhone(profiles, "0999999999")).toBeNull();
  });

  it("ignores profiles with no phone on file", () => {
    const withEmpty = [...profiles, { user_id: "user-c", phone: null }];
    expect(matchProfileByPhone(withEmpty, "")).toBeNull();
  });
});
