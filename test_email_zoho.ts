
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Testing Zoho Mail Configuration...");
    console.log(`User: ${process.env.ZOHO_USER}`);
    // Don't log password, but check if it exists
    console.log(`Password present: ${!!process.env.ZOHO_PASSWORD}`);

    const host = process.env.ZOHO_SMTP_HOST || "smtp.zoho.in";
    console.log(`SMTP host: ${host}`);

    const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.ZOHO_SMTP_PORT || "465"),
        secure: true,
        auth: {
            user: process.env.ZOHO_USER,
            pass: process.env.ZOHO_PASSWORD,
        },
    });

    try {
        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("SMTP Connection Successful!");

        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"Nuriek Test" <${process.env.ZOHO_USER}>`,
            to: "arun@nuriek.com", // Assuming this is the user's email or self-test
            subject: "Zoho Mail Test",
            text: "If you receive this, Zoho Mail is working correctly!",
            html: "<b>If you receive this, Zoho Mail is working correctly!</b>",
        });

        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

main();
