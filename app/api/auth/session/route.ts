import { NextRequest, NextResponse } from "next/server";

const MOCK_SESSION_COOKIE = "mockSession";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, mockEmail } = body;
    
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    if (mockEmail) {
      // Mode prototypage : cookie de session mock
      response.cookies.set(MOCK_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 1, // 1 jour (prototypage)
        path: "/",
      });
    } else {
      // Mode production : cookie Firebase
      response.cookies.set("firebaseToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 5, // 5 jours
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true });
    // Clear both cookies on logout
    response.cookies.set("firebaseToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set(MOCK_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
