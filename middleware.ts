import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const LOGIN_PATH = "/login";
const PUBLIC_PATHS = ["/contact-hr", "/offer"];

function isPublicAsset(pathname: string) {
    return (
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico" ||
        pathname === "/logo.png" ||
        /\.(svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)
    );
}

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const tokenRole = token?.role as string | undefined;
        const { pathname } = req.nextUrl;

        if (isPublicAsset(pathname)) {
            return NextResponse.next();
        }

        if (pathname.startsWith("/api/auth")) {
            return NextResponse.next();
        }

        if (pathname.startsWith("/api/offer/")) {
            return NextResponse.next();
        }

        if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
            return NextResponse.next();
        }

        if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
            if (
                isAuth &&
                pathname.startsWith("/contact-hr") &&
                tokenRole !== "EMPLOYEE" &&
                tokenRole !== "INTERN"
            ) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
            return NextResponse.next();
        }

        if (!isAuth) {
            if (pathname.startsWith("/api/")) {
                return new NextResponse("Unauthorized", { status: 401 });
            }

            let from = pathname;
            if (req.nextUrl.search) from += req.nextUrl.search;
            return NextResponse.redirect(
                new URL(`/login?callbackUrl=${encodeURIComponent(from)}`, req.url)
            );
        }

        const mustChangePassword = Boolean(token?.mustChangePassword);
        const isAdminToken =
            tokenRole === "FOUNDER" || tokenRole === "HR_ADMIN";
        const passwordExempt =
            pathname.startsWith("/settings") ||
            pathname.startsWith("/api/profile/password") ||
            pathname.startsWith("/api/auth") ||
            pathname.startsWith("/api/attendance") ||
            pathname.startsWith("/api/config/public") ||
            (isAdminToken && pathname.startsWith("/api/admin/")) ||
            pathname.startsWith("/api/drive") ||
            (isAdminToken && pathname === "/api/drive/upload") ||
            (isAdminToken && pathname.startsWith("/api/documents"));

        if (mustChangePassword && !passwordExempt) {
            if (pathname.startsWith("/api/")) {
                return NextResponse.json(
                    { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
                    { status: 403 }
                );
            }
            return NextResponse.redirect(new URL("/settings?changePassword=required", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: () => true,
        },
    }
);

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
    ],
};
