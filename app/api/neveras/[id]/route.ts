import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { NeveraInsert } from "@/lib/types";

const NEVERA_UPDATE_FIELDS = [
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

function sanitizeNeveraUpdate(body: Partial<NeveraInsert>): Partial<NeveraInsert> {
  return Object.fromEntries(
    NEVERA_UPDATE_FIELDS
      .filter(field => body[field] !== undefined)
      .map(field => [field, body[field]]),
  ) as Partial<NeveraInsert>;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = sanitizeNeveraUpdate(await req.json());
  const { data, error } = await supabase
    .from("neveras")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("neveras")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
