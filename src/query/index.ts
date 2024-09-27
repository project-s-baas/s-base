import { Hono } from 'hono';
import select from './crud/select';
import insert from './crud/insert';
import transaction from './transaction';

const query = new Hono();

query.route('/select', select);
query.route('/insert', insert);
query.route('/transaction', transaction)

export default query;
