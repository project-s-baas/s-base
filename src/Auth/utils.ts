import jwt from 'jsonwebtoken';
// @ts-ignore
import SQLBuilder from 'json-sql-builder2';
import db from '../database';
import { HTTPException } from 'hono/http-exception';

const jwtSecret = process.env.JWT_SECRET!; // JWT 비밀 키 (환경 변수로 설정)

// JWT 토큰 발급 함수
export const generateJwtToken = (user_id: string, role: string) => {
  const payload = {
    user_id: user_id,
    role: role,
  };

  // 토큰 생성 (expiresIn: 12시간 만료)
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '12h' });
  return token;
};

const sql = new SQLBuilder('PostgreSQL');

interface User {
  email: string;
  username?: string;
  avatar?: string;
  provider: string;
}

export const findOrCreateUser = async (
  user: User
): Promise<Record<string, any>> => {
  // 이메일을 기반으로 유저가 이미 존재하는지 확인
  const existingUserQuery = sql.$select({
    $columns: {
      '*': true,
    },
    $from: 'users',
    $where: {
      email: user.email,
    },
  });

  const existingUserResult = await db.query(
    existingUserQuery.sql,
    existingUserQuery.values
  );

  if (existingUserResult.rows.length > 0) {
    // 유저가 이미 존재할 경우
    return existingUserResult.rows[0];
  } else {
    // 유저가 존재하지 않을 경우
    const insertQuery = sql.$insert({
      $table: 'users',
      $documents: user,
    });

    await db.query(insertQuery.sql, insertQuery.values);
    const userResult = await db.query(
      existingUserQuery.sql,
      existingUserQuery.values
    );

    return userResult.rows[0];
  }
};

export const decodeJwtToken = (token: string): Record<string, any> => {
  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

    // 토큰의 기간 만료 확인
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new HTTPException(401, {
        message: 'token expired',
      });
    }

    return decoded as Record<string, any>;
  } catch (error: any) {
    console.error('토큰 디코딩 실패:', error.message);
    throw new HTTPException(error.status, {
      message: error.message,
    });
  }
};
