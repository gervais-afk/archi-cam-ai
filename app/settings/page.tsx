"use client";

import Navbar       from "@/components/layout/Navbar";
import CreditsCard  from "@/components/settings/CreditsCard";
import LogoUploader from "@/components/settings/LogoUploader";
import { MOCK_USER } from "@/lib/mock-data";
import {
  User,
  Bell,
  Lock,
  ChevronRight,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const user = MOCK_USER;

  return (
    <div className="min-h-screen bg-anthracite-900">
      <Navbar />

      <div className="pt-16">
        {/* Page header */}
        <div className="border-b border-anthracite-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-2 text-sm text-anthracite-500 mb-3">
              <span>Compte</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">Paramètres</span>
            </div>
            <h1 className="font-display font-bold text-white text-2xl">
              Paramètres de l&apos;agence
            </h1>
            <p className="text-anthracite-400 text-sm mt-1">
              {user.agencyName} · {user.email}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left: Nav (placeholder) */}
            <div className="lg:col-span-1 space-y-1">
              {[
                { icon: User,   label: "Profil de l'agence", active: false },
                { icon: Shield, label: "Abonnement & Crédits", active: true  },
                { icon: Bell,   label: "Notifications",        active: false },
                { icon: Lock,   label: "Sécurité",             active: false },
              ].map(({ icon: Icon, label, active }) => (
                <button
                  key={label}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all
                    ${active
                      ? "bg-wood-ocre/10 border border-wood-ocre/20 text-wood-ocre"
                      : "text-anthracite-400 hover:text-white hover:bg-anthracite-800"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* Right: Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Profile Info */}
              <div className="card-dark rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-5">
                  Informations de l&apos;agence
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Nom de l'agence",  value: user.agencyName,                            editable: true  },
                    { label: "Email professionnel", value: user.email,                              editable: true  },
                    { label: "Plan actif",        value: "Pass Agence Pro",                          editable: false },
                    { label: "Membre depuis",     value: user.createdAt.toLocaleDateString("fr-FR"), editable: false },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="block text-anthracite-400 text-xs mb-1.5">
                        {field.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          defaultValue={field.value}
                          readOnly={!field.editable}
                          className={`
                            flex-1 px-3 py-2.5 rounded-lg text-sm transition-all
                            ${field.editable
                              ? "bg-anthracite-800 border border-anthracite-700 text-white focus:border-wood-ocre/50 focus:outline-none"
                              : "bg-anthracite-800/50 border border-anthracite-700/50 text-anthracite-400 cursor-default"
                            }
                          `}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex justify-end">
                  <button className="btn-primary text-sm py-2.5 px-6">
                    Sauvegarder les modifications
                  </button>
                </div>
              </div>

              {/* Credits Card */}
              <CreditsCard />

              {/* Logo Uploader */}
              <LogoUploader />

              {/* Danger Zone */}
              <div className="card-dark rounded-2xl p-6 border-red-900/30">
                <h3 className="text-white font-semibold mb-1">
                  Zone dangereuse
                </h3>
                <p className="text-anthracite-400 text-xs mb-5">
                  Ces actions sont irréversibles. Procédez avec précaution.
                </p>
                <button className="text-sm text-red-400 border border-red-900/50 hover:border-red-700/60 hover:bg-red-900/10 px-4 py-2 rounded-lg transition-all">
                  Supprimer le compte
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
