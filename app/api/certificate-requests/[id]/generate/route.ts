import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildCertificateHtml } from "@/lib/certificate-document";
import { NURIEK_LEGAL_NAME } from "@/lib/nuriek-letter-theme";

const ADMIN_ROLES = ["FOUNDER", "HR_ADMIN"];

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await props.params;
    const userId = session.user.id;
    const userRole = session.user.role;
    const isAdmin = ADMIN_ROLES.includes(userRole);

    try {
        const request = await prisma.certificateRequest.findUnique({
            where: { id },
            include: {
                user: {
                    include: { profile: true },
                },
            },
        });

        if (!request) return new NextResponse("Not Found", { status: 404 });

        if (!isAdmin && request.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (request.status !== "APPROVED") {
            return new NextResponse("Certificate is not yet approved", { status: 403 });
        }

        const user = request.user;
        const profile = user.profile;
        const formattedDate = new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        const joinDate = profile?.joinDate
            ? new Date(profile.joinDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
              })
            : "the date of joining";

        const approvedDate = request.approvedAt
            ? new Date(request.approvedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
              })
            : formattedDate;

        const roleFriendly = (user.role || "Employee")
            .replace(/_/g, " ")
            .split(" ")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
        const department = profile?.department || "the organization";
        const position = profile?.position || roleFriendly;

        let bodyHtml = "";
        let heading = "";

        if (request.type === "EXPERIENCE") {
            heading = "Experience Certificate";
            bodyHtml = `
                <p>This is to certify that <strong>${user.name}</strong> was employed with <strong>${NURIEK_LEGAL_NAME}</strong>
                as a <strong>${position}</strong> in the <strong>${department}</strong> department, with effect from <strong>${joinDate}</strong>.</p>
                <p>During their tenure with us, ${user.name} demonstrated strong professional ethics, technical competence, and contributed positively to the organization's goals.</p>
                <p>We wish ${user.name} the very best in all future endeavors.</p>
            `;
        } else {
            heading = "Bonafide Certificate";
            const purposeText = request.purpose
                ? `for the purpose of <strong>${request.purpose}</strong>`
                : "as proof of employment";
            bodyHtml = `
                <p>This is to certify that <strong>${user.name}</strong> (Email: <strong>${user.email}</strong>) is a bonafide
                ${roleFriendly} of <strong>${NURIEK_LEGAL_NAME}</strong>, working in the
                <strong>${department}</strong> department as <strong>${position}</strong>, with effect from <strong>${joinDate}</strong>.</p>
                <p>This certificate is issued ${purposeText}, on their request.</p>
            `;
        }

        const ref = `NRK-${request.type.charAt(0)}-${id.slice(-6).toUpperCase()}`;

        const html = buildCertificateHtml({
            heading,
            userName: user.name || "Employee",
            bodyHtml,
            refLabel: `Ref. No: ${ref}`,
            issueDate: formattedDate,
            signatoryName: request.approvedBy || "Authorized Signatory",
            verifiedNote: `Digitally generated on ${approvedDate} via Nuriek Core · Ref: NRK-${id.slice(-8).toUpperCase()}`,
        });

        return new NextResponse(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    } catch (error) {
        console.error("[GET /api/certificate-requests/[id]/generate]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
