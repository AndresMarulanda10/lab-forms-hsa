import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { NeveraInsert } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("neveras")
    .select("*")
    .order("nombre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body: NeveraInsert = await req.json();
  const { data, error } = await supabase
    .from("neveras")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
