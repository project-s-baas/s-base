import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
// @ts-ignore
import SQLBuilder from "json-sql-builder2";
import db from "../../database";

const transaction = new Hono();
const sql = new SQLBuilder("PostgreSQL");

transaction.post("/", async (c) => {
  if (!c.req.json) {
    throw new HTTPException(400, {
      message: "No JSONQuery data provided",
    });
  }

  const jsonQuerys = await c.req.json();

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    // JSON 리스트로부터 쿼리를 순차적으로 실행
    for (const jsonQuery of jsonQuerys) {
      const query = sql.build(jsonQuery);

      await client.query(query.sql, query.values);
      console.log("쿼리 실행:", query.sql);
    }

    await client.query("COMMIT");
    console.log("트랜잭션 성공");

    return c.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("트랜잭션 에러:", err);
    throw new HTTPException(401, {
      message: "Error executing query",
    });
  } finally {
    client.release();
    console.log("트랜잭션 종료");
  }
});

export default transaction;
