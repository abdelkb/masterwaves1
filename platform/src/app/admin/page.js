import { redirect } from 'next/navigation';

// /admin est fusionné dans /pro (onglet Partenaires visible pour le rôle admin)
export default function AdminRedirect() {
  redirect('/pro');
}
