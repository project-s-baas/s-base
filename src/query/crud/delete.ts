import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
// @ts-ignore
import SQLBuilder from "json-sql-builder2";
import db from "../../database";

const del = new Hono();
const sql = new SQLBuilder("PostgreSQL");

del.post("/", async (c) => {
    if (!c.req.json) {
        throw new HTTPException(400, {
        message: "No JSONQuery data provided",
        });
    }
    
    const jsonQuery = await c.req.json();
    
    try {
        const query = sql.$delete(jsonQuery);
    
        const res = await db.query(query.sql, query.values);
    
        return c.json({ success: true, data: res });
    } catch (error: any) {
        console.error("Error executing query:", error.message);
        throw new HTTPException(401, {
        message: "Error executing query",
        });
    }
});

export default del;
