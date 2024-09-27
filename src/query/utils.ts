import type { Table } from "./types";

function extractColumnMapping(
  tables: Table[],
  fromTable: string,
  joinTables: Record<string, any>
): Record<string, string> {
  const tableNames = [fromTable, ...Object.keys(joinTables)]; // $from과 $join 테이블 리스트 합치기
  const mapping: Record<string, string> = {};

  // 테이블 목록에서 $from 및 $join에 있는 테이블을 찾고, 각 테이블의 컬럼 키 추출
  tableNames.forEach((tableName) => {
    const table = tables.find((t) => t.name === tableName);
    if (table) {
      table.schema.forEach((column) => {
        const tableColumn = `${table.name}_${column.name}`; // table_column 형식
        const tableDotColumn = `${table.name}.${column.name}`; // table.column 형식
        mapping[tableDotColumn] = tableColumn; // {table_column : 'table.column'}로 변환
      });
    }
  });

  return mapping;
}

function mapRowsToObjects(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row) => {
    const result: Record<string, any> = {};

    // 각 row의 필드를 순회하며 별칭을 기준으로 객체로 변환
    for (const [key, value] of Object.entries(row)) {
      const parts = key.split("_");

      const table = parts[0]; // 첫 번째는 테이블 이름
      const column = parts.slice(1).join("_"); // 나머지를 결합해서 컬럼 이름으로 사용

      // 테이블 이름이 result 객체에 없으면 추가
      if (!result[table]) {
        result[table] = {};
      }

      // 테이블 객체에 열 추가
      result[table][column] = value;
    }

    return result;
  });
}

function convertTableColumnFormat(
  obj: Record<string, any>
): Record<string, string> {
  const result: Record<string, string> = {};

  // 입력 객체의 각 키와 값을 순회
  for (const [key, value] of Object.entries(obj)) {
    if (value) {
      // "."을 "_"로 변환한 새로운 값 생성
      const newValue = key.replace(/\./g, "_");

      // 기존 키를 값으로, 변환된 값을 키로 설정
      result[key] = newValue;
    }
  }

  return result;
}

export { mapRowsToObjects, convertTableColumnFormat, extractColumnMapping };

// // 예시 SQL 결과 row
// const row = {
//   people_id: 1,
//   people_first_name: "John",
//   people_last_name: "Doe",
//   skills_id: 10,
//   skills_description: "JavaScript",
//   skills_rate: 90,
// };

// // 매핑 실행
// const mappedResult = mapRowToObjects(row);
// console.log(mappedResult);

// const tables: Table[] = [
//     {
//       visible: true,
//       name: "users",
//       description: "유저 기본 테이블",
//       schema: [
//         {name: "id", type: "UUID", primary: true, unique: false, notnull: false, default: "uuid_generate_v4()"},
//         {name: "email", type: "VARCHAR(100)", primary: false, unique: true, notnull: true},
//         {name: "username", type: "VARCHAR(100)", primary: false, unique: false, notnull: false, default: "Anonymous"}
//       ]
//     },
//     {
//       visible: true,
//       name: "posts",
//       description: "게시글 테이블",
//       schema: [
//         {name: "id", type: "UUID", primary: true, unique: false, notnull: false, default: "uuid_generate_v4()"},
//         {name: "title", type: "VARCHAR(100)", primary: false, unique: false, notnull: true},
//         {name: "content", type: "TEXT", primary: false, unique: false, notnull: true},
//         {name: "user_id", type: "UUID", primary: false, unique: false, notnull: true, reference: "users(id)"}
//       ]
//     }
//   ];

//   const mapping = generateTableColumnMapping(tables);
//   console.log(mapping);

// const columns = {
//     'people.first_name': true,
//     'people.last_name': true,
//     'skills.description': true,
//     'ratings.description': true
//   };

//   const convertedColumns = convertTableColumnFormat(columns);
//   console.log(convertedColumns);
