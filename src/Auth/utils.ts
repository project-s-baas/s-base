import { use } from 'hono/jsx';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET!; // JWT 비밀 키 (환경 변수로 설정)

// JWT 토큰 발급 함수
export const generateJwtToken = (userId: string) => {
  // TODO : 나중에 user_id 로 대체

  const payload = {
    userId: userId
  };

  // 토큰 생성 (expiresIn: 12시간 만료)
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '12h' });
  return token;
};
