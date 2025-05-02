import { NextResponse } from "next/server";

export function middleware(req) {
  const basicAuth = req.headers.get("authorization");

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, password] = atob(authValue).split(":");

    if (user === "climbcovers" && password === "$h2kf084;sj9fj..") {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}
