import type { Database } from '../../database';

class ConfigLoader {
  private cachedTables: any = null; // 캐시된 config 저장
  private database: Database; // 데이터베이스 연결

  constructor(database: Database) {
    this.database = database;
  }

  private async fetchFromTables(): Promise<any> {
    const res = await this.database.query(`SELECT 
    c.table_schema,
    c.table_name,
    c.column_name,
    CASE 
        WHEN c.data_type = 'character varying' THEN 
            'varchar(' || c.character_maximum_length || ')'
        WHEN c.data_type = 'numeric' THEN 
            c.data_type || '(' || c.numeric_precision || ',' || c.numeric_scale || ')'
        WHEN c.data_type = 'character' THEN
            'char(' || c.character_maximum_length || ')'
        WHEN c.data_type = 'timestamp without time zone' THEN
            'timestamp'
        WHEN c.data_type = 'timestamp with time zone' THEN
            'timestamptz'
        WHEN t.typname = 'vector' THEN
            'vector(' || a.atttypmod || ')'
        ELSE c.data_type
    END AS full_data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    json_agg(
        json_build_object(
            'constraint_type', tc.constraint_type,
            'constraint_name', tc.constraint_name,
            'foreign_table_name', ccu.table_name,
            'foreign_column_name', ccu.column_name,
            'update_rule', rc.update_rule,
            'delete_rule', rc.delete_rule
        )
    ) AS constraints
FROM 
    information_schema.columns c
LEFT JOIN 
    pg_catalog.pg_attribute a ON (c.table_name::regclass::oid = a.attrelid AND c.column_name = a.attname)
LEFT JOIN 
    pg_catalog.pg_type t ON (a.atttypid = t.oid)
LEFT JOIN 
    information_schema.key_column_usage kcu 
    ON c.table_name = kcu.table_name 
    AND c.column_name = kcu.column_name 
    AND c.table_schema = kcu.table_schema
LEFT JOIN 
    information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name 
    AND kcu.table_schema = tc.table_schema
LEFT JOIN 
    information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.table_schema = tc.table_schema
LEFT JOIN 
    information_schema.referential_constraints rc 
    ON rc.constraint_name = tc.constraint_name 
    AND rc.constraint_schema = tc.constraint_schema
WHERE 
    c.table_schema NOT IN ('information_schema', 'pg_catalog')
GROUP BY 
    c.table_schema, c.table_name, c.column_name, c.data_type, 
    c.character_maximum_length, c.numeric_precision, c.numeric_scale, 
    c.is_nullable, c.column_default, c.ordinal_position, 
    t.typname, a.atttypmod
ORDER BY 
    c.table_schema, c.table_name, c.ordinal_position`);
    const configData = res.rows.reduce((acc: any, row: any) => {
      const tableName = row.table_name;
      if (!acc[tableName]) {
        acc[tableName] = [];
      }
      acc[tableName].push(row);
      return acc;
    }, {});

    console.log(configData);

    return configData;
  }

  // 캐시를 강제로 갱신하는 함수
  public async refreshTablesCache(): Promise<void> {
    try {
      this.cachedTables = await this.fetchFromTables();
      //   console.log("Config cache refreshed:", this.cachedConfig);
    } catch (error) {
      console.error('Error refreshing config cache:', error);
      throw new Error('Failed to refresh cache');
    }
  }

  // 캐시된 config를 반환하고, 없으면 초기화
  public async getTables(): Promise<any> {
    if (!this.cachedTables) {
      console.log('No cache found, fetching from database...');
      await this.refreshTablesCache(); // 캐시가 없으면 새로 불러옴
    } else {
      console.log('Cache found, Returning cached config');
    }
    return this.cachedTables;
  }
}

export default ConfigLoader;
