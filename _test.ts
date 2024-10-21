// @ts-ignore
import SQLBuilder from 'json-sql-builder2';

let sql = new SQLBuilder('PostgreSQL');

// lets start some query fun
let Q = sql.$select({
  $columns: {
    people_id: 1,
    first_name: 1,
    last_name: 1,
    test: {
      $select: {
        $columns: {
          total_likes: { $count: '*' },
        },
        $from: 'people',
      },
    },
  },
  $from: 'my_temp_people_table',
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
      'people.first_name': true,
      'people.last_name': true,
      'skills.description': true,
      'ratings.description': true,
    },
    $from: 'people',
    $join: {
      people_skills: {
        $inner: 'people_skills',
        $on: {
          'skills.people_id': { $eq: '~~people.people_id' },
        },
      },
      ratings: {
        $left: 'ratings',
        $on: { 'skills.rate_id': '~~ratings.rate_id' },
      },
    },
    $where: {
      'skills.rate': { $gt: 50 },
    },
  },
});

const q3 = sql.$insert({
  $table: 'embeddings',
  $documents: {
    user_id: '6e6eee5b-b7b6-409b-a2ad-af5942b87544',
    embedding: '[1,23,32]',
  },
});

console.log(q3);

// const q4 = sql.$select({
//   __: 'embedding <-> [3,1,2]'
// });

const q5 = sql.$select({
  $columns: {
    '*': true,
  },
  $from: 'embeddings',
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
    '*': true,
  },
  $from: 'embeddings',
  $where: {
    $and: ["embedding <-> '[1,2,3]' > 5"],
  },
});

console.log(q6);

// $sql : {} 로 해서 $sql 이 붙은 문은 서버에서 한 번 미리 다 찾아서 sql 문으로 변환해주자.
// where 안의 $sql 은 $and 를 붙인다던지
// 그 외는 그에 맞게 __: 를 붙인다던지 등등 처리를 하자.

const q7 = sql.build({
  $select: {
    $columns: {
      '*': true,
      st: {
        __: 'ST_Distance(ST_MakePoint(2.2945, 48.8584)::geography,ST_MakePoint(-74.0445, 40.6892)::geography)',
      },
    },
    $from: 'embeddings',
    $where: {
      $and: ["embedding <-> '[1,2,3]' > 5"],
    },
  },
});

console.log(q7.sql);
