import { NextRequest, NextResponse } from "next/server";
import { MOCK_ACCOUNTS } from "@/lib/mock-auth";

const MOCK_SESSION_COOKIE = "mockSession";

export async function GET(req: NextRequest) {
  try {
    const mockSession = req.cookies.get(MOCK_SESSION_COOKIE)?.value;

    if (mockSession) {
      try {
        const { email } = JSON.parse(atob(mockSession));
        const account = MOCK_ACCOUNTS[email];
        if (account) {
          return NextResponse.json({
            user: account.profile,
            role: account.role,
            projects: account.projects,
            source: "mock",
          });
        }
      } catch {
        // Invalid cookie
      }
    }

    // No session found
    return NextResponse.json({ user: null, role: null, projects: [] }, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
