import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
// @ts-ignore
import SQLBuilder from 'json-sql-builder2';
import db from '../../database';
import {
  convertTableColumnFormat,
  extractColumnMapping,
  mapRowsToObjects,
} from '../utils';
import ConfigLoader from '../config';

const select = new Hono();
const sql = new SQLBuilder('PostgreSQL');
const configLoader = new ConfigLoader(db);
const tables = await configLoader.getTables();

// POST 요청을 처리하고, 동적으로 JSON 쿼리를 받아 SQL로 변환 후 실행
select.post('/', async (c) => {
  if (!c.req.json) {
    throw new HTTPException(400, {
      message: 'No JSONQuery data provided',
    });
  }

  // 클라이언트에서 전달한 JSON 데이터를 받음
  const jsonQuery = await c.req.json();

  // JOIN 연산이 있는 경우
  if (jsonQuery.$join) {
    // $columns 안에 "*": true 가 존재하는 경우에는 모든 컬럼을 가져오는 것으로 간주
    if (jsonQuery.$columns['*']) {
      const mapping = extractColumnMapping(
        tables,
        jsonQuery.$from,
        jsonQuery.$join
      );
      jsonQuery.$columns = mapping;
    } else {
      // JOIN 연산을 사용하는 경우, 테이블과 컬럼 이름을 변환
      jsonQuery.$columns = convertTableColumnFormat(jsonQuery.$columns);
    }
  }

  try {
    // SQLBuilder를 통해 JSON 데이터를 SQL 쿼리로 변환
    const query = sql.$select(jsonQuery);

    const res = await db.query(query.sql, query.values);

    let data;

    if (jsonQuery.$join) {
      data = mapRowsToObjects(res.rows);
    } else {
      data = res.rows;
    }

    // 결과 반환
    return c.json({ success: true, data: data });
  } catch (error: any) {
    console.error('Error executing query:', error.message);
    throw new HTTPException(401, {
      message: 'Error executing query',
    });
  }
});

export default select;
