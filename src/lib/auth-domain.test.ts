import { describe, expect, it } from "vitest";
import { extraCoachEmails, isAllowedEmail, isCoach } from "./auth-domain";

describe("isCoach", () => {
  it("accepts verified @yaqbot.com accounts, any case", () => {
    expect(isCoach({ email: "hola@yaqbot.com", email_verified: true })).toBe(true);
    expect(isCoach({ email: "Coach@YaqBot.com", email_verified: true })).toBe(true);
  });
  it("rejects other domains", () => {
    expect(isCoach({ email: "me@gmail.com", email_verified: true })).toBe(false);
  });
  it("rejects look-alike domains", () => {
    expect(isCoach({ email: "a@yaqbot.com.evil.com", email_verified: true })).toBe(false);
    expect(isCoach({ email: "a@notyaqbot.com", email_verified: true })).toBe(false);
    expect(isCoach({ email: "a@sub.yaqbot.com", email_verified: true })).toBe(false);
    expect(isCoach({ email: "yaqbot.com@gmail.com", email_verified: true })).toBe(false);
  });
  it("rejects unverified, missing or malformed emails", () => {
    expect(isCoach({ email: "hola@yaqbot.com", email_verified: false })).toBe(false);
    expect(isCoach({ email: "hola@yaqbot.com" })).toBe(false);
    expect(isCoach({ email: "@yaqbot.com", email_verified: true })).toBe(false);
    expect(isCoach({ email: null, email_verified: true })).toBe(false);
    expect(isCoach(null)).toBe(false);
  });
});

describe("extra coach emails (testing aid)", () => {
  it("is empty by default and ignores junk", () => {
    expect(extraCoachEmails(undefined)).toEqual([]);
    expect(extraCoachEmails("")).toEqual([]);
    expect(extraCoachEmails("not-an-email, ,")).toEqual([]);
  });
  it("parses a comma separated list, trimmed and lowercased", () => {
    expect(extraCoachEmails(" Me@Gmail.com , you@x.org ")).toEqual(["me@gmail.com", "you@x.org"]);
  });
  it("allows only the exact listed address, and still needs a verified email", () => {
    const extra = ["me@gmail.com"];
    expect(isCoach({ email: "ME@gmail.com", email_verified: true }, extra)).toBe(true);
    expect(isCoach({ email: "other@gmail.com", email_verified: true }, extra)).toBe(false);
    expect(isCoach({ email: "me@gmail.com", email_verified: false }, extra)).toBe(false);
    expect(isCoach({ email: "xme@gmail.com", email_verified: true }, extra)).toBe(false);
  });
  it("does not weaken the domain rule", () => {
    expect(isAllowedEmail("hola@yaqbot.com", [])).toBe(true);
    expect(isAllowedEmail("a@yaqbot.com.evil.com", ["me@gmail.com"])).toBe(false);
  });
});

