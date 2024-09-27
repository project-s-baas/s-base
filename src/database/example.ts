const db = require('./db');

// 쿼리 실행 예제
async function getUsers() {
  try {
    const res = await db.query('SELECT * FROM users WHERE active = $1', [true]);
    console.log(res.rows);
  } catch (err) {
    console.error('쿼리 에러:', err);
  }
}

getUsers();

// transactionExample
async function performTransaction() {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    const insertText = 'INSERT INTO users(name, email) VALUES($1, $2) RETURNING id';
    const insertValues = ['John Doe', 'john.doe@example.com'];
    const res = await client.query(insertText, insertValues);
    const userId = res.rows[0].id;

    const updateText = 'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2';
    const updateValues = [100, userId];
    await client.query(updateText, updateValues);

    await client.query('COMMIT');
    console.log('트랜잭션 성공');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('트랜잭션 에러:', err);
  } finally {
    client.release();
  }
}

performTransaction();
