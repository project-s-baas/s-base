import { Hono } from 'hono';
import auth from './src/auth';


// Hono 앱 초기화
const app = new Hono();

app.route('/auth', auth)

export default app;
