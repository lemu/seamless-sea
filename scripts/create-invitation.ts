/**
 * Create invitation for production user
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = "https://gallant-viper-145.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function createInvitation() {
  console.log("Creating invitation for rafal.lemieszewski@sea.live...");

  try {
    const invitationId = await client.mutation(api.invitations.createInvitation, {
      email: "rafal.lemieszewski@sea.live",
      organizationId: "jn7ccnv64at1jyxt0ytp6nwe457p2qrm" as any,
      role: "admin",
      invitedBy: "jd76qd9ej7e8j25n3m9vpwtkeh7x8anr" as any,
    });

    console.log("✓ Invitation created:", invitationId);

    // Get the invitation to retrieve the token
    const invitation = await client.query(api.invitations.getInvitationByToken, {
      token: invitationId as any,
    });

    if (invitation) {
      const inviteUrl = `https://seamless-sea.vercel.app/invite/${invitation.token}`;
      console.log("\n🎉 Invitation URL:");
      console.log(inviteUrl);
      console.log("\nSend this link to rafal.lemieszewski@sea.live");
    }
  } catch (error: any) {
    console.error("✗ Failed to create invitation:", error.message || error);
  }
}

createInvitation().catch(console.error);
