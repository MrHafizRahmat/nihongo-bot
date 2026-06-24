import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Admin client — used for everything
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Extract JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Verify the token and get the user using admin client
    const { data: { user }, error: userError } = await adminClient.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: " + userError?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is a teacher
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "teacher") {
      return new Response(JSON.stringify({ error: "Forbidden: teachers only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { students } = await req.json();

    if (!Array.isArray(students) || students.length === 0) {
      return new Response(JSON.stringify({ error: "No students provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(
      students.map(async (student) => {
        const { full_name, email, password, level } = student;

        if (!full_name || !email || !password || !level) {
          return { email, status: "failed", reason: "Missing required fields" };
        }

        if (!["A0", "A1", "A2"].includes(level)) {
          return { email, status: "failed", reason: "Invalid level — must be A0, A1, or A2" };
        }

        if (password.length < 6) {
          return { email, status: "failed", reason: "Password must be at least 6 characters" };
        }

        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: "student", full_name },
        });

        if (error) {
          const reason = error.message.includes("already been registered")
            ? "Email already registered"
            : error.message;
          return { email, status: "failed", reason };
        }

        await adminClient
          .from("profiles")
          .update({ full_name, level })
          .eq("id", data.user.id);

        await adminClient
          .from("teacher_students")
          .insert({ teacher_id: user.id, student_id: data.user.id });

        return { email, full_name, level, status: "success" };
      })
    );

    const summary = {
      total: results.length,
      succeeded: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status === "failed").length,
      results,
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});