import { Hono } from 'hono';
import { AuthorizationCode } from 'simple-oauth2';
import { HTTPException } from 'hono/http-exception';
import { findOrCreateUser, generateJwtToken } from '../utils';
// @ts-ignore
import SQLBuilder from 'json-sql-builder2';

// GitHub OAuth 설정
const clientID = process.env.GITHUB_ID!;
const clientSecret = process.env.GITHUB_SECRET!;
const redirectUri = process.env.GITHUB_CALLBACK!;

// GitHub OAuth 설정
const githubOAuth = new AuthorizationCode({
  client: {
    id: clientID,
    secret: clientSecret,
  },
  auth: {
    tokenHost: 'https://github.com',
    tokenPath: '/login/oauth/access_token',
    authorizePath: '/login/oauth/authorize',
  },
});

// Hono 앱 초기화
const github = new Hono();

// 로그인 요청 처리
github.get('/login', (c) => {
  const authorizationUri = githubOAuth.authorizeURL({
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state: 'randomstring', // CSRF 공격을 방지하기 위한 상태 값
  });

  // GitHub 로그인 페이지로 리다이렉트
  return c.redirect(authorizationUri);
});

// GitHub에서 콜백을 처리하고 액세스 토큰 발급
github.get('/callback', async (c) => {
  const code = c.req.query('code'); // GitHub에서 전달된 인증 코드
  const tokenParams = {
    code: code as string,
    redirect_uri: redirectUri,
  };

  try {
    // 토큰 발급 요청
    const accessTokenResponse = await githubOAuth.getToken(tokenParams);
    const accessToken = accessTokenResponse.token.access_token;

    // GitHub API에서 유저 정보 가져오기 (fetch 사용)
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new HTTPException(500, {
        message: 'Failed to fetch user information',
      });
    }

    const userInfo = await userResponse.json();

    // GitHub API에서 이메일 정보 가져오기 (fetch 사용)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!emailResponse.ok) {
      throw new HTTPException(500, {
        message: 'Failed to fetch user emails',
      });
    }

    const emailInfo = await emailResponse.json();

    // primary: true 인 이메일만 필터링
    const primaryEmail = emailInfo.find((email: any) => email.primary === true);

    if (!primaryEmail) {
      throw new HTTPException(404, { message: 'No primary email found' });
    }

    const userData = {
      email: primaryEmail.email,
      username: userInfo.login || null,
      avatar: userInfo.avatar_url || null,
      provider: 'github',
    };

    const userResult = await findOrCreateUser(userData);

    if (userResult.provider !== 'github') {
      throw new HTTPException(409, {
        message: 'This email is already registered with another provider.',
      });
    }

    // 자체 서버 토큰 발급
    let token = '';

    try {
      token = generateJwtToken(userResult.id, userResult.role);
    } catch (error: any) {
      console.error('토큰 발급 실패:', error.message);
      throw new HTTPException(500, {
        message: 'Error occurred during token retrieval',
      });
    }

    return c.json({
      token: token,
    });
  } catch (error: any) {
    console.error(
      '토큰 발급 실패 또는 사용자 정보 가져오기 실패:',
      error.message
    );
    throw new HTTPException(error.status, {
      message: error.message,
    });
  }
});

export default github;
