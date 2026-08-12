import { auth } from "@/auth";
import { PATH_LOGIN, PATH_API_AUTH } from "@/lib/constants";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow login page and API auth routes
  if (pathname.startsWith(PATH_LOGIN) || pathname.startsWith(PATH_API_AUTH)) {
    return;
  }

  // Redirect unauthenticated users to login
  if (!req.auth) {
    const loginUrl = new URL(PATH_LOGIN, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
