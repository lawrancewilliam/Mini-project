import { json } from '@sveltejs/kit';
import { readFileSync, existsSync, writeFileSync } from 'fs';
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

export async function POST({ request }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const users = loadUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const { password: _, ...safeUser } = user;

    return json({ success: true, user: safeUser }, { status: 200 });
  } catch (err) {
    return json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
