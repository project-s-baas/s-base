const jsonToSql = require('./src/lib/jsonToSql');

var sqlGenerator = new jsonToSql();

const { sql, values } = sqlGenerator.select({
  $from: 'table1',
  $fields: [
    'column1a',
    'column1b',
    '*',

    {
      $inner: 'table2',
      $on: {
        $parent: 'table2ForeignKey',
        $child: 'primaryKey',
      },
      $fields: [
        {
          $field: 'column2a',
          $as: 'column2b',
        },
        'column2b',
      ],
    },
    {
      $field: 'column_a',
      $groupConcat: true,
      $as: 'column_date',
    },
  ],
  $where: [
    {
      $field: 'column_b',
      $eq: 1,
    },
    {
      $or: [{ column_a: 1 }, { column_b: 1 }],
    },
  ],
});

console.log(sql, values);

const sqlParams = {
  $insert: 'mytable',
  $values: {
    column_a: `testasd'''\"\" ㅋㄴ
    ㅁㅇ 
    \t \r \0 \b \t \n \r \\`,
    column_b: 1,
  },
};

const { sql: sql2, values: values2 } = sqlGenerator.insert(sqlParams);
console.log(values2[0]);
