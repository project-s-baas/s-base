import { Hono } from 'hono';
import auth from './src/auth';
import query from './src/query';
import { logger } from 'hono/logger'

// Hono 앱 초기화
const app = new Hono();

app.use(logger())

app.route('/auth', auth)
app.route('/query', query)

export default app;

