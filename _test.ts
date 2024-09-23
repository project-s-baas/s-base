import { Database } from "bun:sqlite";
// @ts-ignore
import SQLBuilder from "json-sql-builder2";

const db = new Database("mydb.db");

let sql = new SQLBuilder('SQLite');
let create_sql = new SQLBuilder('PostgreSQL');

db.exec("PRAGMA journal_mode = wal2;");

// lets start some query fun
let Q = sql.$select({
    "*": true,
    $from: 'my_temp_people_table',
    $where: {
        people_id: { $gt: 10 }
    }
});

let Create = create_sql.$createTable({
    $table: 'my_temp_people_table',
    $define: {
        people_id: { $column: { $type: 'INT', $default: 0 } },
        first_name: { $column: { $type: 'VARCHAR', $size: 50, $notNull: true } },
        last_name: { $column: { $type: 'VARCHAR', $size: 50, $notNull: true } },
        bio: { $column: { $type: 'TEXT' } }
    }
});

// console.log(Q);

// const query = db.query(Q.sql).all(Q.values);
// console.log(query)

db.prepare(Create.sql).run(Create.values);