import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { RegistroNeveraInsert } from "@/lib/types";

type LegacyRegistroNeveraBody = RegistroNeveraInsert & {
  dispositivo_marca?: string;
  dispositivo_modelo?: string;
  dispositivo_serial?: string;
  certificado?: string;
  factor_correccion?: string;
};

function stripLegacyDeviceFields(body: LegacyRegistroNeveraBody): RegistroNeveraInsert {
  const {
    dispositivo_marca: _dispositivoMarca,
    dispositivo_modelo: _dispositivoModelo,
    dispositivo_serial: _dispositivoSerial,
    certificado: _certificado,
    factor_correccion: _factorCorreccion,
    ...registro
  } = body;

  return registro;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const año = searchParams.get("año");
  const mes = searchParams.get("mes");
  const neveraId = searchParams.get("nevera_id");

  let query = supabase
    .from("registros_neveras")
    .select("*, nevera:neveras(*)")
    .order("año", { ascending: false })
    .order("mes", { ascending: false });

  if (año) query = query.eq("año", parseInt(año));
  if (mes) query = query.eq("mes", parseInt(mes));
  if (neveraId) query = query.eq("nevera_id", neveraId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = stripLegacyDeviceFields(await req.json());

  const { data, error } = await supabase
    .from("registros_neveras")
    .upsert(body, { onConflict: "nevera_id,año,mes" })
    .select("*, nevera:neveras(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 200 });
}
