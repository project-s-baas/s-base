import { Hono } from 'hono';
import { AuthorizationCode } from 'simple-oauth2';
import { HTTPException } from 'hono/http-exception';
import { generateJwtToken } from '../utils';

// Google OAuth 설정
const clientID = process.env.GOOGLE_ID!;
const clientSecret = process.env.GOOGLE_SECRET!;
const redirectUri = process.env.GOOGLE_CALLBACK!; // 콜백 URL

// Google OAuth 설정
const googleOAuth = new AuthorizationCode({
  client: {
    id: clientID,
    secret: clientSecret,
  },
  auth: {
    authorizeHost: 'https://accounts.google.com',
    authorizePath: '/o/oauth2/v2/auth',

    tokenHost: 'https://www.googleapis.com',
    tokenPath: '/oauth2/v4/token',
  },
});

// Hono 앱 초기화
const google = new Hono();

// 로그인 요청 처리
google.get('/login', (c) => {
  const authorizationUri = googleOAuth.authorizeURL({
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state: 'randomstring', // CSRF 공격을 방지하기 위한 상태 값
  });

  // Google 로그인 페이지로 리다이렉트
  return c.redirect(authorizationUri);
});

// Google에서 콜백을 처리하고 액세스 토큰 발급
google.get('/callback', async (c) => {
  const code = c.req.query('code'); // Google에서 전달된 인증 코드
  const tokenParams = {
    code: code!,
    redirect_uri: redirectUri,
  };

  try {
    // 토큰 발급 요청
    const accessTokenResponse = await googleOAuth.getToken(tokenParams);
    const accessToken = accessTokenResponse.token.access_token;

    // Google API에서 유저 정보 가져오기 (fetch 사용)
    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new HTTPException(401, {
        message: 'Failed to fetch user information',
      });
    }

    const userInfo = await userResponse.json();

    const user = {
      email: userInfo.email,
      username: userInfo.name, // Google에서 제공되는 유저명
      avatar: userInfo.picture, // 프로필 사진 URL
    };

    // 자체 서버 토큰 발급
    let token = '';
    try {
      token = generateJwtToken('유저아이디 todo');
    } catch (error: any) {
      console.error('토큰 발급 실패:', error.message);
      throw new HTTPException(401, {
        message: 'Error occurred during token retrieval',
      });
    }

    return c.json({
      token: token,
      user: user, // 사용자 정보도 함께 반환
    });
  } catch (error: any) {
    console.error(
      '토큰 발급 실패 또는 사용자 정보 가져오기 실패:',
      error.message
    );
    throw new HTTPException(401, {
      message: 'Error occurred during token retrieval or user info request',
    });
  }
});

export default google;
