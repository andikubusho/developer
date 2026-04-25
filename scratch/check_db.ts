// @ts-nocheck
import { api } from './src/lib/api';

async function check() {
  try {
    const data = await api.get('users', 'limit=1');
    console.log('Users table exists:', data);
  } catch (e) {
    console.log('Users table does not exist or error:', e.message);
  }
}
check();
