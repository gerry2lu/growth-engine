import NextAuth from "next-auth";
import Providers from "next-auth/providers";

const ALLOWED_DOMAIN = "yourcompany.com";

export default NextAuth({
    providers: [
        Providers.Google({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
        }),
    ],
    callbacks: {
        async signIn(user, account, profile) {
            if (user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
                return true;
            }
            return false;
        },
    },
});