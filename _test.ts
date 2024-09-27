// @ts-ignore
import SQLBuilder from "json-sql-builder2";

let sql = new SQLBuilder("PostgreSQL");

// lets start some query fun
let Q = sql.$select({
  $columns: {
    people_id: 1,
    first_name: 1,
    last_name: 1,
    test: {
      $select: {
        $columns: {
          total_likes: { $count: "*" },
        },
        $from: "people",
      },
    },
  },
  $from: "my_temp_people_table",
  $where: {
    people_id: { $gt: 10 },
  },
});

// console.log(Q);

// const query = db.query(Q.sql).all(Q.values);
// console.log(query)

const q2 = sql.build({
  $select: {
    $columns: {
      "people.first_name": true,
      "people.last_name": true,
      "skills.description": true,
      "ratings.description": true,
    },
    $from: "people",
    $join: {
      people_skills: {
        $inner: "people_skills",
        $on: {
          "skills.people_id": { $eq: "~~people.people_id" },
        },
      },
      ratings: {
        $left: "ratings",
        $on: { "skills.rate_id": "~~ratings.rate_id" },
      },
    },
    $where: {
      "skills.rate": { $gt: 50 },
    },
  },
});

const q3 = sql.$insert({
  $table: "embeddings",
  $documents: {
    user_id: "6e6eee5b-b7b6-409b-a2ad-af5942b87544",
    embedding: "[1,23,32]",
  },
});

console.log(q3);

// const q4 = sql.$select({
//   __: 'embedding <-> [3,1,2]'
// });

const q5 = sql.$select({
  $columns: {
    "*": true,
  },
  $from: "embeddings",
  $where: {
    $and: [
      {
        $or: [
          { $and: ["embedding <-> '[1,2,3]' > 5"] },
          { $and: ["embedding <-> '[1,2,3]' > 5"] },
        ],
      },
      {
        $or: [
          { $and: ["embedding <-> '[1,2,3]' > 5"] },
          { $and: ["embedding <-> '[1,2,3]' > 5"] },
        ],
      },
    ],
  },
});

console.log(q5);

const q6 = sql.$select({
  $columns: {
    "*": true,
  },
  $from: "embeddings",
  $where: {
    $and: [
      "embedding <-> '[1,2,3]' > 5",
    ],
  },
});

console.log(q6);
