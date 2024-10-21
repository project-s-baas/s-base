const API_URL = 'http://localhost:3000'; // API 서버 주소를 적절히 변경하세요

describe('동시 API 호출 테스트', () => {
  it('여러 개의 SELECT 요청을 동시에 처리할 수 있어야 합니다', async () => {
    const numberOfRequests = 100; // 동시에 보낼 요청 수
    const requests = [];

    for (let i = 0; i < numberOfRequests; i++) {
      const request = fetch(`${API_URL}/query/select`, {
        method: 'POST',
        body: JSON.stringify({
          $columns: {
            '*': true,
          },
          $from: 'posts',
          $join: {
            users: {
              $inner: 'users',
              $on: {
                'users.id': { $eq: '~~posts.user_id' },
              },
            },
          },
          $limit: 10,
        }),
      }).then((response) => response.json());
      requests.push(request);
    }

    const results = await Promise.all(requests);

    // 모든 요청이 성공적으로 처리되었는지 확인
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  it('에러 상황에서도 다른 요청들이 정상적으로 처리되어야 합니다', async () => {
    const requests = [
      fetch(`${API_URL}/query/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ $from: 'users' }),
      }),
      fetch(`${API_URL}/query/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ $from: 'non_existent_table' }),
      }),
      fetch(`${API_URL}/query/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ $from: 'products' }),
      }),
    ];
  });
});
