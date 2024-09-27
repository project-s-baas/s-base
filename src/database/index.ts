import { Pool } from 'pg';
import type { PoolClient, QueryResult } from 'pg';

class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
    });

    // 풀 에러 핸들링
    this.pool.on('error', (err: Error, client: PoolClient) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  // 싱글톤 인스턴스 반환
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // 쿼리 실행 메서드
  public query(text: string, params?: any[]): Promise<QueryResult<any>> {
    return this.pool.query(text, params);
  }

  // 클라이언트 직접 사용 시
  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const instance = Database.getInstance();
Object.freeze(instance); // 인스턴스 변경 방지

export default instance;
export type { Database };
