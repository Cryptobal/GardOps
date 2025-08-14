import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/configuracion/seguridad/usuarios');
}


