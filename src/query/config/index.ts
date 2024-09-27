import type { Database } from "../../database";

class ConfigLoader {
  private cachedConfig: any = null; // 캐시된 config 저장
  private database: Database; // 데이터베이스 연결

  constructor(database: Database) {
    this.database = database;
  }

  // 데이터베이스에서 config 테이블의 database 값을 가져오는 함수
  private async fetchFromConfig(): Promise<any> {
    const res = await this.database.query("SELECT database FROM config ORDER BY created_at DESC LIMIT 1;");
    return res.rows[0]; // JSON 형식
  }

  // 캐시를 강제로 갱신하는 함수
  public async refreshCache(): Promise<void> {
    try {
      this.cachedConfig = await this.fetchFromConfig();
    //   console.log("Config cache refreshed:", this.cachedConfig);
    } catch (error) {
      console.error("Error refreshing config cache:", error);
      throw new Error("Failed to refresh cache");
    }
  }

  // 캐시된 config를 반환하고, 없으면 초기화
  public async getConfig(): Promise<any> {
    if (!this.cachedConfig) {
      console.log("No cache found, fetching from database...");
      await this.refreshCache(); // 캐시가 없으면 새로 불러옴
    } else {
      console.log("Cache found, Returning cached config");
    }
    return this.cachedConfig;
  }
}

export default ConfigLoader;