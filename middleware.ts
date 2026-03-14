import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isLoginPage = req.nextUrl.pathname.startsWith("/login");

        if (isLoginPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
            return null;
        }

        if (!isAuth) {
            let from = req.nextUrl.pathname;
            if (req.nextUrl.search) {
                from += req.nextUrl.search;
            }

            return NextResponse.redirect(
                new URL(`/login?callbackUrl=${encodeURIComponent(from)}`, req.url)
            );
        }
    },
    {
        callbacks: {
            async authorized() {
                // This is a work-around for handled redirect above
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*", "/attendance/:path*", "/directory/:path*", "/interns/:path*", "/documents/:path*", "/leave/:path*", "/drive/:path*", "/settings/:path*", "/login"],
};
