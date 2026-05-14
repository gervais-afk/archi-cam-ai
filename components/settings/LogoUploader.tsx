"use client";

import { useCallback, useState } from "react";
import { useDropzone }           from "react-dropzone";
import { Upload, X, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

export default function LogoUploader() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setError(null);
    setSaved(false);

    // Validate PNG
    if (!["image/png", "image/svg+xml"].includes(file.type)) {
      setError("Format requis : PNG ou SVG (fond transparent recommandé)");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"], "image/svg+xml": [".svg"] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const handleSave = async () => {
    if (!logoFile) return;
    setSaving(true);
    setError(null);
    // TODO: Upload to Firebase Storage → update Firestore user doc
    await new Promise((r) => setTimeout(r, 1500)); // simulate upload
    setSaving(false);
    setSaved(true);
  };

  const handleRemove = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setSaved(false);
    setError(null);
  };

  return (
    <div className="card-dark rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-wood-ocre/10 border border-wood-ocre/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-wood-ocre" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Logo de l&apos;agence</h3>
          <p className="text-anthracite-400 text-xs">
            Remplace le filigrane Archi-Cameroun AI sur vos rendus
          </p>
        </div>
      </div>

      {/* Current preview */}
      {logoPreview ? (
        <div className="mb-6 relative">
          <div className="p-6 rounded-xl bg-anthracite-800 border border-anthracite-700 flex items-center justify-center">
            <div
              className="relative"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
              }}
            >
              <img
                src={logoPreview}
                alt="Logo agence"
                className="max-h-24 max-w-xs object-contain"
              />
            </div>
          </div>

          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-anthracite-700 hover:bg-red-900/50 text-anthracite-400 hover:text-red-400 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-anthracite-700" />
            <p className="text-anthracite-500 text-xs px-2">
              {logoFile?.name}
            </p>
            <div className="h-px flex-1 bg-anthracite-700" />
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          {...getRootProps()}
          className={`
            mb-6 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer
            transition-all duration-300
            ${isDragActive
              ? "border-wood-ocre bg-wood-ocre/10"
              : "border-anthracite-700 hover:border-wood-ocre/40 hover:bg-wood-ocre/5"
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-anthracite-800 border border-anthracite-700 flex items-center justify-center">
            <Upload
              className={`w-6 h-6 ${
                isDragActive ? "text-wood-ocre" : "text-anthracite-500"
              }`}
            />
          </div>
          <p className="text-white font-medium text-sm mb-1">
            Glissez votre logo ici
          </p>
          <p className="text-anthracite-500 text-xs mb-3">
            PNG ou SVG avec fond transparent recommandé
          </p>
          <span className="text-xs text-anthracite-600">Max 5 MB</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mb-4 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success message */}
      {saved && (
        <div className="flex items-center gap-2 mb-4 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Logo enregistré — Il sera appliqué sur vos prochains rendus
        </div>
      )}

      {/* Instructions */}
      <div className="bg-anthracite-800 rounded-xl p-4 border border-anthracite-700 mb-6">
        <h4 className="text-anthracite-300 text-xs font-semibold mb-2 uppercase tracking-wider">
          Recommandations
        </h4>
        <ul className="space-y-1.5">
          {[
            "Format PNG ou SVG avec fond transparent",
            "Résolution min. 400×200 px pour une qualité optimale",
            "Le logo apparaît en bas à droite du rendu",
            "Réservé aux abonnés Pass Agence Pro",
          ].map((tip) => (
            <li key={tip} className="text-anthracite-500 text-xs flex items-start gap-2">
              <span className="text-wood-ocre mt-0.5">·</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!logoFile || saving || saved}
        className={`
          w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300
          ${!logoFile || saving || saved
            ? "bg-anthracite-800 text-anthracite-600 cursor-not-allowed border border-anthracite-700"
            : "btn-primary"
          }
        `}
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Enregistrement...
          </span>
        ) : saved ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Logo enregistré
          </span>
        ) : (
          "Enregistrer le logo"
        )}
      </button>
    </div>
  );
}
