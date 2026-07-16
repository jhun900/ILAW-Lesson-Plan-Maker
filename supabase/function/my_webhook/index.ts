import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const bodyText = await req.text();
      const signature = req.headers.get("paymongo-signature") ?? "";
      const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");

      if (!signature || !webhookSecret) {
         return new Response("Unauthorized signature missing", { status: 401 });
      }

      const payload = JSON.parse(bodyText);
      const attributes = payload.data.attributes;
      const paymentStatus = attributes.data.attributes.status;
      const userId = attributes.data.attributes.metadata.userId;

      if (paymentStatus === "paid") {
         const creditAmount = attributes.data.attributes.amount / 100;
         
         const { data: profile } = await ctx.supabaseAdmin.from('profiles').select('credits').eq('id', userId).single();
         const updatedCredits = (profile?.credits || 0) + creditAmount;

         await ctx.supabaseAdmin
           .from('profiles')
           .update({ credits: updatedCredits })
           .eq('id', userId);
      }

      return Response.json({ received: true });

    } catch (err) {
      console.error("Webhook error:", err);
      return new Response("Internal Error", { status: 500 });
    }
  }),
};