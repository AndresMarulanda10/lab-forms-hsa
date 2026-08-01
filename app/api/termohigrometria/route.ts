import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { RegistroTermohigrometriaInsert } from "@/lib/types";

const CONFLICT_ERROR = {
  error: "El registro fue modificado por otra sesión. Recarga y revisa los datos más recientes.",
  code: "VERSION_CONFLICT",
};

const VERSION_REQUIRED_ERROR = {
  error: "La solicitud no incluye una versión vigente. Recarga la página antes de guardar.",
  code: "VERSION_REQUIRED",
};

const conflictResponse = () => NextResponse.json(CONFLICT_ERROR, { status: 409 });

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const año = searchParams.get("año");
  const mes = searchParams.get("mes");

  if (año && (!/^\d{4}$/.test(año) || Number(año) < 2020)) {
    return NextResponse.json({ error: "El año debe ser 2020 o posterior." }, { status: 400 });
  }

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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud no contiene JSON válido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  const requestBody = body as Record<string, unknown>;
  if (!("expected_updated_at" in requestBody)) {
    return NextResponse.json(VERSION_REQUIRED_ERROR, { status: 409 });
  }

  const { expected_updated_at: expectedUpdatedAt, ...mutationBody } = requestBody;
  const año = mutationBody.año;
  const mes = mutationBody.mes;
  const validExpectedVersion = expectedUpdatedAt === null ||
    (typeof expectedUpdatedAt === "string" && expectedUpdatedAt.length > 0 && !Number.isNaN(Date.parse(expectedUpdatedAt)));
  if (!Number.isInteger(año) || !Number.isInteger(mes) || Number(año) < 2020 || Number(mes) < 1 || Number(mes) > 12 || !validExpectedVersion) {
    return NextResponse.json({ error: "El contexto o la versión del registro no son válidos." }, { status: 400 });
  }

  const mutation = mutationBody as unknown as RegistroTermohigrometriaInsert;

  if (typeof expectedUpdatedAt === "string") {
    const { data, error } = await supabase
      .from("registros_termohigrometria")
      .update(mutation)
      .eq("año", Number(año))
      .eq("mes", Number(mes))
      .eq("updated_at", expectedUpdatedAt)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return conflictResponse();
    return NextResponse.json(data, { status: 200 });
  }

  const { data, error } = await supabase
    .from("registros_termohigrometria")
    .insert(mutation)
    .select()
    .single();

  if (error?.code === "23505") return conflictResponse();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 200 });
}
