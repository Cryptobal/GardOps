import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { redirect } from 'next/navigation';

export default function SeguridadIndex() {
  redirect('/configuracion/seguridad');
}


