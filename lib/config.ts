const fs = require('fs');
const path = require('path');


interface ConfigType {
  key: string;
}

class Config {
  private static instance: Config;
  private config: ConfigType | undefined;

  public constructor() {

    // 인스턴스가 이미 생성되어 있다면, 기존 인스턴스를 반환합니다.
    if (Config.instance) {
      return Config.instance;
    }

    const configPath = path.resolve(process.cwd(), 'config.json');
    
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    this.config = config;

    return this
  }

  public set(config: ConfigType): void {
    this.config = config;
  }

  public get(): ConfigType {
    return this.config as ConfigType;
  }
}

export { Config };