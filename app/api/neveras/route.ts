import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { NeveraInsert } from "@/lib/types";

const NEVERA_INSERT_FIELDS = [
  "nombre",
  "codigo",
  "ubicacion",
  "activa",
  "dispositivo",
  "dispositivo_marca",
  "dispositivo_modelo",
  "dispositivo_serial",
  "certificado",
  "factor_correccion",
] as const satisfies readonly (keyof NeveraInsert)[];

function sanitizeNeveraInsert(body: Partial<NeveraInsert>): NeveraInsert {
  return Object.fromEntries(
    NEVERA_INSERT_FIELDS
      .filter(field => body[field] !== undefined)
      .map(field => [field, body[field]]),
  ) as NeveraInsert;
}

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
  const body = sanitizeNeveraInsert(await req.json());
  const { data, error } = await supabase
    .from("neveras")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
