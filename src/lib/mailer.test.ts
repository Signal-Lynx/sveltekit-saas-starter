import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

// ---------------------------
// Hoisted test doubles
// ---------------------------
const H = vi.hoisted(() => {
  return {
    // Minimal supabase admin shape used by mailer.ts
    supabaseAdmin: {
      auth: { admin: { getUserById: vi.fn() } },
      // Query builder chain (from -> select -> eq -> single)
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    },
    // SES send spy
    mockSesSend: vi.fn(),
    // Mutable env bag to simulate different configs per test
    envBag: {
      PRIVATE_AWS_REGION: "us-east-1",
      PRIVATE_AWS_ACCESS_KEY_ID: "mock_key",
      PRIVATE_AWS_SECRET_ACCESS_KEY: "mock_secret",
      PRIVATE_SES_CONFIGURATION_SET: "Mock-Config-Set",
      PRIVATE_FROM_ADMIN_EMAIL: "admin@example.com",
      PRIVATE_ADMIN_EMAIL: "admin@example.com",
    } as Record<string, string | undefined>,
  }
})

// ---------------------------
// Module mocks
// ---------------------------

// 1. Mock the validated env module so we don't trigger Zod validation
vi.mock("$lib/server/env", () => ({
  get env() {
    return H.envBag
  },
}))

// 2. Mock AWS SDK
vi.mock("@aws-sdk/client-sesv2", () => {
  // SESv2Client constructor + send()
  const SESv2Client = vi.fn(function () {
    return { send: H.mockSesSend }
  })
  const SendEmailCommand = vi.fn(function (input) {
    return { input }
  })
  return { SESv2Client, SendEmailCommand }
})

// 3. Mock Supabase Admin
vi.mock("$lib/server/supabaseAdmin", () => ({
  supabaseAdmin: H.supabaseAdmin,
}))

// 4. Mock Public Config
vi.mock("../config", () => ({
  WebsiteName: "Test Co",
  WebsiteDescription: "Test Desc",
}))

// ---------------------------
// Import after mocks
// ---------------------------
import * as mailer from "./mailer"
import type { User } from "@supabase/supabase-js"

// ---------------------------
// Helpers
// ---------------------------
function setEnv(vars: Record<string, string | undefined>) {
  Object.assign(H.envBag, vars)
}
function clearEnv(keys: string[]) {
  for (const k of keys) delete H.envBag[k]
}
function lastSesCommandInput<T = any>(): T | undefined {
  const call = H.mockSesSend.mock.calls.at(-1)?.[0]
  return call?.input ?? call
}
// Make text assertions robust against formatting/line-wrap changes
const squash = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim()

// ---------------------------
// Fixtures
// ---------------------------
const AWS_KEYS = [
  "PRIVATE_AWS_REGION",
  "PRIVATE_AWS_ACCESS_KEY_ID",
  "PRIVATE_AWS_SECRET_ACCESS_KEY",
]

const defaultAwsEnv = {
  PRIVATE_AWS_REGION: "us-east-1",
  PRIVATE_AWS_ACCESS_KEY_ID: "mock_key",
  PRIVATE_AWS_SECRET_ACCESS_KEY: "mock_secret",
  PRIVATE_SES_CONFIGURATION_SET: "Mock-Config-Set",
}

// ---------------------------
// Test suite
// ---------------------------
describe("mailer with AWS SES", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Restore default env state
    setEnv(defaultAwsEnv)

    // Default supabase behaviors
    H.supabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email_confirmed_at: new Date().toISOString() } },
      error: null,
    })
    // Default unsubscribe lookup: not unsubscribed
    H.supabaseAdmin.single.mockResolvedValue({
      data: { unsubscribed: false },
      error: null,
    })

    // Successful SES send response
    H.mockSesSend.mockResolvedValue({ MessageId: "mock-ses-message-id" })
  })

  afterEach(() => {
    // No specific cleanup needed for H.envBag as beforeEach resets it mostly,
    // but we can ensure cleanliness if needed.
  })

  describe("sendUserEmail", () => {
    const mockUser: Pick<User, "id" | "email"> = {
      id: "user123",
      email: "user@example.com",
    }

    it("sends welcome email via SES with config set", async () => {
      await mailer.sendUserEmail({
        user: mockUser as User,
        subject: "Test Welcome",
        from_email: "from@example.com",
        template_name: "welcome_email",
        template_properties: {
          companyName: "Test Co",
          WebsiteBaseUrl: "https://test.com",
        },
      })

      expect(H.mockSesSend).toHaveBeenCalledTimes(1)

      const input = lastSesCommandInput<any>()
      expect(input).toBeTruthy()

      // Destination & From
      expect(input.Destination?.ToAddresses).toEqual(["user@example.com"])
      expect(input.FromEmailAddress).toEqual("from@example.com")

      // Config Set Verification
      expect(input.ConfigurationSetName).toEqual("Mock-Config-Set")

      // Subject
      expect(input.Content?.Simple?.Subject?.Data).toEqual("Test Welcome")

      // Body check
      const textBody: string | undefined =
        input.Content?.Simple?.Body?.Text?.Data
      const htmlBody: string | undefined =
        input.Content?.Simple?.Body?.Html?.Data

      const expectedWelcome = `Welcome to the Test Co Command Center`

      expect(squash(textBody)).toContain(expectedWelcome)
      expect(squash(htmlBody)).toContain(expectedWelcome)
    })

    it("does not send email when user is unsubscribed", async () => {
      H.supabaseAdmin.single.mockResolvedValue({
        data: { unsubscribed: true },
        error: null,
      })

      await mailer.sendUserEmail({
        user: mockUser as User,
        subject: "Test",
        from_email: "test@example.com",
        template_name: "welcome_email",
        template_properties: {},
      })

      expect(H.mockSesSend).not.toHaveBeenCalled()
    })

    it("does not attempt send if AWS creds are missing", async () => {
      // Remove credentials to simulate misconfiguration
      clearEnv(AWS_KEYS)

      await expect(
        mailer.sendUserEmail({
          user: mockUser as User,
          subject: "No AWS",
          from_email: "from@example.com",
          template_name: "welcome_email",
          template_properties: {},
        }),
      ).resolves.toBeUndefined()

      // Ensure we never touched SES
      expect(H.mockSesSend).not.toHaveBeenCalled()
    })
  })

  describe("sendAdminEmail", () => {
    it("sends an admin email via SES with config set", async () => {
      setEnv({
        PRIVATE_ADMIN_EMAIL: "admin@example.com",
        PRIVATE_FROM_ADMIN_EMAIL: "noreply@example.com",
      })

      await mailer.sendAdminEmail({
        subject: "Admin Alert",
        body: "This is a test alert.",
      })

      expect(H.mockSesSend).toHaveBeenCalledTimes(1)

      const input = lastSesCommandInput<any>()
      expect(input).toBeTruthy()

      expect(input.Destination?.ToAddresses).toEqual(["admin@example.com"])
      expect(input.FromEmailAddress).toEqual("noreply@example.com")
      expect(input.ConfigurationSetName).toEqual("Mock-Config-Set")

      expect(input.Content?.Simple?.Subject?.Data).toEqual(
        "ADMIN_MAIL: Admin Alert",
      )
    })

    it("no-ops if PRIVATE_ADMIN_EMAIL is not configured", async () => {
      // Ensure not set
      delete H.envBag.PRIVATE_ADMIN_EMAIL

      await expect(
        mailer.sendAdminEmail({
          subject: "Missing Admin",
          body: "Should not send",
        }),
      ).resolves.toBeUndefined()

      expect(H.mockSesSend).not.toHaveBeenCalled()
    })
  })
})
