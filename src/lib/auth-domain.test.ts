import { describe, expect, it } from "vitest";
import { isCoach } from "./auth-domain";

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
