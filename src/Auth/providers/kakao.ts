import { Hono } from 'hono';
import { AuthorizationCode } from 'simple-oauth2';
import { HTTPException } from 'hono/http-exception';
import { findOrCreateUser, generateJwtToken } from '../utils';

// 카카오 OAuth 설정
const clientID = process.env.KAKAO_ID!;
const clientSecret = process.env.KAKAO_SECRET!; // 카카오 보안 설정 시 필수
const redirectUri = process.env.KAKAO_CALLBACK!; // 콜백 URL

// 카카오 OAuth 설정
const kakaoOAuth = new AuthorizationCode({
  client: {
    id: clientID,
    secret: clientSecret,
  },
  auth: {
    authorizeHost: 'https://kauth.kakao.com',
    authorizePath: '/oauth/authorize',

    tokenHost: 'https://kauth.kakao.com',
    tokenPath: '/oauth/token',
  },
});

// Hono 앱 초기화
const kakao = new Hono();

// 로그인 요청 처리
kakao.get('/login', (c) => {
  const authorizationUri = kakaoOAuth.authorizeURL({
    redirect_uri: redirectUri,
    scope: 'profile_nickname profile_image account_email',
    state: 'randomstring', // CSRF 공격을 방지하기 위한 상태 값
  });

  // 카카오 로그인 페이지로 리다이렉트
  return c.redirect(authorizationUri);
});

// 카카오에서 콜백을 처리하고 액세스 토큰 발급
kakao.get('/callback', async (c) => {
  const code = c.req.query('code'); // 카카오에서 전달된 인증 코드
  const tokenParams = {
    code: code!,
    redirect_uri: redirectUri,
    client_id: clientID,
    grant_type: 'authorization_code',
  };
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };

  try {
    // 토큰 발급 요청
    const accessTokenResponse = await kakaoOAuth.getToken(tokenParams);
    const accessToken = accessTokenResponse.token.access_token;

    // 카카오 API에서 유저 정보 가져오기 (fetch 사용)
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new HTTPException(500, {
        message: 'Failed to fetch user information',
      });
    }

    const userInfo = await userResponse.json();

    const userData = {
      email: userInfo.kakao_account.email,
      username: userInfo.properties.nickname || null,
      avatar: userInfo.properties.profile_image || null,
      provider: 'kakao',
    };

    const userResult = await findOrCreateUser(userData);

    if (userResult.provider !== 'kakao') {
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

export default kakao;
