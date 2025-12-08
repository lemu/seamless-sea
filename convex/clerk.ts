/**
 * Clerk Webhook Handler for Convex
 *
 * This HTTP endpoint receives webhooks from Clerk and syncs user, organization,
 * and membership data to Convex.
 *
 * SETUP INSTRUCTIONS:
 * 1. Deploy this Convex project: `npx convex deploy`
 * 2. Get your Convex HTTP endpoint URL (will be: https://your-deployment.convex.site)
 * 3. In Clerk Dashboard → Webhooks → Add Endpoint
 * 4. Set URL to: https://your-deployment.convex.site/clerk-webhook
 * 5. Subscribe to events: user.*, organization.*, organizationMembership.*
 * 6. Copy the "Signing Secret" (starts with whsec_)
 * 7. Add to Convex environment variables: CLERK_WEBHOOK_SECRET=whsec_xxx
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Get webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Verify webhook signature using Svix
    const svix = new Webhook(webhookSecret);
    const payload = await request.text();

    // Get required headers for verification
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing svix headers");
      return new Response("Missing webhook headers", { status: 400 });
    }

    let event: any;
    try {
      event = svix.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    console.log("Received Clerk webhook:", event.type);

    // Route events to appropriate sync mutations
    try {
      switch (event.type) {
        case "user.created":
        case "user.updated":
          await ctx.runMutation(internal.clerkSync.syncUser, {
            clerkUserId: event.data.id,
            email: event.data.email_addresses?.[0]?.email_address || "",
            name: `${event.data.first_name || ""} ${event.data.last_name || ""}`.trim() || event.data.username || "Unknown",
            imageUrl: event.data.image_url,
          });
          break;

        case "organization.created":
        case "organization.updated":
          await ctx.runMutation(internal.clerkSync.syncOrganization, {
            clerkOrgId: event.data.id,
            name: event.data.name,
            imageUrl: event.data.image_url,
          });
          break;

        case "organizationMembership.created":
        case "organizationMembership.updated":
          await ctx.runMutation(internal.clerkSync.syncMembership, {
            clerkMembershipId: event.data.id,
            clerkUserId: event.data.public_user_data?.user_id || "",
            clerkOrgId: event.data.organization?.id || "",
            role: event.data.role || "org:member",
          });
          break;

        case "organizationMembership.deleted":
          await ctx.runMutation(internal.clerkSync.removeMembership, {
            clerkMembershipId: event.data.id,
          });
          break;

        case "user.deleted":
          // Soft delete - keep business data but anonymize user
          await ctx.runMutation(internal.clerkSync.markUserDeleted, {
            clerkUserId: event.data.id || "",
          });
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
