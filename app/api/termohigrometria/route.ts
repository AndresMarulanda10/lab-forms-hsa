import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const año = searchParams.get("año");
  const mes = searchParams.get("mes");

  let query = supabase
    .from("registros_termohigrometria")
    .select("*")
    .order("año", { ascending: false })
    .order("mes", { ascending: false });

  if (año) query = query.eq("año", parseInt(año));
  if (mes) query = query.eq("mes", parseInt(mes));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("registros_termohigrometria")
    .upsert(body, { onConflict: "año,mes" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 200 });
}
