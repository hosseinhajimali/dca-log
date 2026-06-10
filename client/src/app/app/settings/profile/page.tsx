import { redirect } from 'next/navigation';

// Profile merged into Account. Keep old URL working.
export default function ProfileRedirect() {
  redirect('/app/settings/account');
}
