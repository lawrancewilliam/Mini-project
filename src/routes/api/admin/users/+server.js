import { json } from '@sveltejs/kit';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');

function loadUsers() {
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, '[]', 'utf-8');
    return [];
  }
  const data = readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

export async function GET() {
  try {
    const users = loadUsers();
    const safeUsers = users.map(({ password, ...rest }) => rest);
    return json({ success: true, users: safeUsers }, { status: 200 });
  } catch (err) {
    console.error('GET admin users error:', err);
    return json({ success: false, error: err?.message || 'Failed to load users.' }, { status: 500 });
  }
}

export async function DELETE({ url }) {
  try {
    const userId = url.searchParams.get('id');
    if (!userId) {
      return json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    const users = loadUsers();
    const filtered = users.filter(u => u.id !== userId);

    if (filtered.length === users.length) {
      return json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    writeFileSync(USERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE admin user error:', err);
    return json({ success: false, error: err?.message || 'Failed to delete user.' }, { status: 500 });
  }
}

export async function PATCH({ request }) {
  try {
    const { id, role } = await request.json();
    if (!id || !role) {
      return json({ success: false, error: 'User ID and role are required.' }, { status: 400 });
    }

    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) {
      return json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    user.role = role;
    writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    const { password: _, ...safeUser } = user;
    return json({ success: true, user: safeUser }, { status: 200 });
  } catch (err) {
    console.error('PATCH admin user error:', err);
    return json({ success: false, error: err?.message || 'Failed to update user.' }, { status: 500 });
  }
}
