import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, title, message } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: user } = await supabase.auth.admin.getUserById(user_id);
    const email = user?.user?.email;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const htmlBody = `
      <div style="font-family: monospace; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">NEUZ</h1>
        <p style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 32px;">Studio Panel</p>
        <div style="border: 1px solid #e5e5e5; padding: 24px;">
          <p style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">${title}</p>
          <p style="font-size: 13px; color: #555; margin-bottom: 24px;">${message}</p>
          <a href="${Deno.env.get('SITE_URL') || 'http://localhost:8080'}" 
             style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; font-size: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
            Ver en el Panel
          </a>
        </div>
        <p style="font-size: 11px; color: #aaa; margin-top: 24px;">NEUZ Studio — notificacion automatica</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'NEUZ Studio <notificaciones@neuz.studio>',
        to: email,
        subject: title,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});