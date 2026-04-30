"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Refrigerator,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";
import type { Nevera } from "@/lib/types";

const empty: Omit<Nevera, "id" | "created_at" | "updated_at"> = {
  nombre: "",
  codigo: "",
  ubicacion: "",
  activa: true,
  dispositivo: "",
  dispositivo_marca: "",
  dispositivo_modelo: "",
  dispositivo_serial: "",
  certificado: "",
  factor_correccion: "0",
};

export default function NeverasPage() {
  const [neveras, setNeveras] = useState<Nevera[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/neveras");
      const data = await res.json();
      setNeveras(Array.isArray(data) ? data : []);
    } catch {
      setNeveras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.codigo.trim()) {
      showToast("Nombre y código son obligatorios", "err");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/neveras/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("Nevera actualizada");
      } else {
        const res = await fetch("/api/neveras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast("Nevera creada exitosamente");
      }
      setForm({ ...empty });
      setEditId(null);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      showToast((err as Error).message || "Error al guardar", "err");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (n: Nevera) => {
    await fetch(`/api/neveras/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !n.activa }),
    });
    showToast(n.activa ? "Nevera desactivada" : "Nevera activada");
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que querés eliminar esta nevera? Se borrarán también todos sus registros.")) return;
    await fetch(`/api/neveras/${id}`, { method: "DELETE" });
    showToast("Nevera eliminada");
    await load();
  };

  const startEdit = (n: Nevera) => {
    setForm({
      nombre: n.nombre,
      codigo: n.codigo,
      ubicacion: n.ubicacion,
      activa: n.activa,
      dispositivo: n.dispositivo ?? "",
      dispositivo_marca: n.dispositivo_marca ?? "",
      dispositivo_modelo: n.dispositivo_modelo ?? "",
      dispositivo_serial: n.dispositivo_serial ?? "",
      certificado: n.certificado ?? "",
      factor_correccion: n.factor_correccion ?? "0",
    });
    setEditId(n.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      <HospitalHeader
        codigo="M-GADT-LAB-F-029"
        version="2"
        nombreDocumento="GESTIÓN DE NEVERAS — CADENA DE FRÍO"
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "ok"
              ? "bg-hsa-green text-white"
              : "bg-hsa-red text-white"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Refrigerator size={22} className="text-hsa-green" />
            <div>
              <h1 className="font-bold text-gray-800 text-lg">Gestión de Neveras</h1>
              <p className="text-xs text-gray-400">Administrá las neveras de la cadena de frío</p>
            </div>
          </div>
          <button
            onClick={() => { setForm({ ...empty }); setEditId(null); setShowForm(!showForm); }}
            className="btn-success"
          >
            <Plus size={16} />
            Nueva nevera
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-4 bg-hsa-green-pale border border-hsa-green rounded-xl"
          >
            <h3 className="font-semibold text-hsa-green mb-3">
              {editId ? "Editar nevera" : "Nueva nevera"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Nombre *</label>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Nevera Reactivos A"
                  required
                />
              </div>
              <div>
                <label className="label">Código *</label>
                <input
                  className="input"
                  value={form.codigo}
                  onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                  placeholder="Ej: NV-001"
                  required
                />
              </div>
              <div>
                <label className="label">Ubicación</label>
                <input
                  className="input"
                  value={form.ubicacion}
                  onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                  placeholder="Ej: Laboratorio Clínico"
                />
              </div>
            </div>
            <div className="mt-4 border-t border-hsa-green/20 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-hsa-green">
                Dispositivo de medición
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div>
                  <label className="label">Dispositivo</label>
                  <input
                    className="input"
                    value={form.dispositivo}
                    onChange={(e) => setForm((f) => ({ ...f, dispositivo: e.target.value }))}
                    placeholder="Ej: Termómetro digital"
                  />
                </div>
                <div>
                  <label className="label">Marca</label>
                  <input
                    className="input"
                    value={form.dispositivo_marca}
                    onChange={(e) => setForm((f) => ({ ...f, dispositivo_marca: e.target.value }))}
                    placeholder="Ej: Elitech"
                  />
                </div>
                <div>
                  <label className="label">Modelo</label>
                  <input
                    className="input"
                    value={form.dispositivo_modelo}
                    onChange={(e) => setForm((f) => ({ ...f, dispositivo_modelo: e.target.value }))}
                    placeholder="Ej: RC-5"
                  />
                </div>
                <div>
                  <label className="label">Serial</label>
                  <input
                    className="input"
                    value={form.dispositivo_serial}
                    onChange={(e) => setForm((f) => ({ ...f, dispositivo_serial: e.target.value }))}
                    placeholder="Ej: SN-001"
                  />
                </div>
                <div>
                  <label className="label">Certificado</label>
                  <input
                    className="input"
                    value={form.certificado}
                    onChange={(e) => setForm((f) => ({ ...f, certificado: e.target.value }))}
                    placeholder="Ej: CERT-2026"
                  />
                </div>
                <div>
                  <label className="label">F. corrección</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={form.factor_correccion}
                    onChange={(e) => setForm((f) => ({ ...f, factor_correccion: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="btn-success" disabled={saving}>
                {saving ? "Guardando..." : editId ? "Actualizar" : "Crear nevera"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setShowForm(false); setEditId(null); setForm({ ...empty }); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">Cargando neveras…</div>
        ) : neveras.length === 0 ? (
          <div className="text-center py-10">
            <Refrigerator size={40} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400">No hay neveras registradas. Creá una para empezar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hsa-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Código
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Ubicación
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Dispositivo
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {neveras.map((n) => (
                  <tr
                    key={n.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !n.activa ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-3 px-2 font-medium">{n.nombre}</td>
                    <td className="py-3 px-2">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {n.codigo}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-500 hidden sm:table-cell">
                      {n.ubicacion || "—"}
                    </td>
                    <td className="py-3 px-2 text-gray-500 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        <p className="font-medium text-gray-700">
                          {[n.dispositivo, n.dispositivo_marca, n.dispositivo_modelo].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Serial: {n.dispositivo_serial || "—"} · Cert: {n.certificado || "—"} · F: {n.factor_correccion || "0"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {n.activa ? (
                        <span className="badge-ok">Activa</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggle(n)}
                          title={n.activa ? "Desactivar" : "Activar"}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-hsa-green"
                        >
                          {n.activa ? <ToggleRight size={17} className="text-hsa-green" /> : <ToggleLeft size={17} />}
                        </button>
                        <button
                          onClick={() => startEdit(n)}
                          title="Editar"
                          className="p-1.5 rounded-lg hover:bg-hsa-green-pale transition-colors text-gray-400 hover:text-hsa-green"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg hover:bg-hsa-red-pale transition-colors text-gray-400 hover:text-hsa-red"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HospitalFooter />
    </div>
  );
}
