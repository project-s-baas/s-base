import { Hono } from 'hono';
import select from './crud/select';
import insert from './crud/insert';
import transaction from './transaction';
import update from './crud/update';
import del from './crud/delete';

const query = new Hono();

query.route('/select', select);
query.route('/insert', insert);
query.route('/update', update);
query.route('/delete', del);
query.route('/transaction', transaction);

export default query;
