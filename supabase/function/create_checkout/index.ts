import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const { amount, userId, email } = await req.json();
      const paymongoSecret = Deno.env.get("PAYMONGO_SECRET_KEY");

      const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${btoa(paymongoSecret + ":")}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              payment_method_types: ["gcash", "card", "maya"],
              amount: amount * 100, // PHP centavos
              currency: "PHP",
              description: `${amount} Credits Top-up`,
              metadata: { userId: userId }
            }
          }
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        return new Response(JSON.stringify(result), { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      return Response.json({ checkoutUrl: result.data.attributes.checkout_url }, { headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }),
};