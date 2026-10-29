import { redirect } from 'next/navigation';

// Accounts and roles are managed from the student sheet.
export default function UsersPage() {
  redirect('/admin/students');
}
