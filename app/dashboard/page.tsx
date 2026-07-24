import { redirect } from 'next/navigation';

export default function DashboardIndexPage() {
  // Par défaut, on redirige vers l'espace particulier.
  // Une logique de redirection basée sur le rôle de l'utilisateur pourrait être ajoutée ici.
  redirect('/dashboard/particulier');
}
