import { Hono } from 'hono';
import github from './providers/github';
import google from './providers/google';
import kakao from './providers/kakao';

const auth = new Hono();

auth.route('/github', github);
auth.route('/google', google);
auth.route('/kakao', kakao);

export default auth;
