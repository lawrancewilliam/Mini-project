import { json } from '@sveltejs/kit';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');

function loadUsers() {
  if (!existsSync(USERS_FILE)) {
    writeFileSync(USERS_FILE, '[]', 'utf-8');
    return [];
  }
  const data = readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export async function POST({ request }) {
  try {
    const { name, email, password, username } = await request.json();
    const role = 'Developer';

    if (!name || !email || !password || !username) {
      return json({ success: false, error: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const users = loadUsers();

    if (users.find(u => u.email === email)) {
      return json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    if (users.find(u => u.username === username)) {
      return json({ success: false, error: 'This username is already taken.' }, { status: 409 });
    }

    const avatar = '';

    const newUser = {
      id: randomUUID(),
      name,
      email,
      password,
      username,
      role,
      avatar,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const { password: _, ...safeUser } = newUser;

    return json({ success: true, user: safeUser }, { status: 201 });
  } catch (err) {
    console.error('Register API error:', err);
    return json({ success: false, error: err?.message || 'Registration failed. Please try again.' }, { status: 500 });
  }
}
