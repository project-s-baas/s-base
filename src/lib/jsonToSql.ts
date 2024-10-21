var jsonToSql = function (): any {
  let counter = 1;
  let values: (string | number | boolean | null)[] = [];

  var escaping = (function () {
    return function (data: string | number | boolean | null) {
      // PostgreSQL의 프리페어드 스테이트먼트를 위한 플레이스홀더 반환
      values.push(data);
      return '$' + counter++;
    };
  })();

  var enclosure = function (param: string) {
    // return '"' + param.toLowerCase() + '"';
    return param;
  };

  /**
   * Building SQL WHERE conditions
   * @param conditions
   * @param parentKey
   * @returns {string}
   */
  var whereBuilder = function (
    conditions: any,
    parentKey: string | null,
    inheritedTable: string | null
  ) {
    let whereKeys = Object.keys(conditions);
    var whereArray: string[] = [];

    var conditionBuilder = function (
      column: string,
      table: string,
      operador: string,
      condition: string
    ) {
      return (
        (table ? enclosure(table) + '.' : '') +
        enclosure(column) +
        ' ' +
        operador +
        ' ' +
        escaping(condition)
      );
    };

    var inBuilder = function (
      column: string,
      table: string,
      operador: string,
      condition: string
    ) {
      return (
        (table ? enclosure(table) + '.' : '') +
        enclosure(column) +
        ' ' +
        operador +
        ' ' +
        condition
      );
    };

    if (Array.isArray(conditions) && conditions.length > 0) {
      conditions.forEach(function (condition) {
        var whereExpression = whereBuilder(
          condition,
          parentKey,
          inheritedTable
        );
        if (whereExpression) {
          whereArray.push(whereExpression);
        }
      });

      return whereArray.join(' AND ');
    }

    // if condition is not an object,then exit....
    if (typeof conditions != 'object') {
      return null;
    }

    // // test if there is a $raw operator
    // if (conditions['$raw']) {
    //   return conditions['$raw'];
    // }

    // test if there is a logical operator
    if (conditions['$or'] || conditions['$and']) {
      let operator: '$or' | '$and';
      let operatorSQL: ' OR ' | ' AND ';

      if (conditions['$or']) {
        operator = '$or';
        operatorSQL = ' OR ';
      } else if (conditions['$and']) {
        operator = '$and';
        operatorSQL = ' AND ';
      }

      let andArray: string[] = [];

      conditions[operator!].forEach(function (element: Record<string, any>) {
        andArray.push(whereBuilder(element, null, inheritedTable)!);
      });

      return '(' + andArray.join(operatorSQL!) + ')';
    }

    // test if there is a $field (complete field with comparison operators
    if (conditions['$field']) {
      var currentTable = conditions['$table']
        ? conditions['$table']
        : inheritedTable;

      if (typeof conditions['$gt'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          '>',
          conditions['$gt']
        );
      } else if (typeof conditions['$gte'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          '>=',
          conditions['$gte']
        );
      } else if (typeof conditions['$lt'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          '<',
          conditions['$lt']
        );
      } else if (typeof conditions['$lte'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          '<=',
          conditions['$lte']
        );
      } else if (typeof conditions['$eq'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          '=',
          conditions['$eq']
        );
      } else if (typeof conditions['$ne'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          '<>',
          conditions['$ne']
        );
      } else if (typeof conditions['$like'] !== 'undefined') {
        return conditionBuilder(
          conditions['$field'],
          currentTable,
          'LIKE',
          conditions['$like']
        );
      } else if (typeof conditions['$in'] !== 'undefined') {
        if (Array.isArray(conditions['$in']) && conditions['$in'].length > 0) {
          conditions['$in'].forEach(function (condition, idx) {
            conditions['$in'][idx] = escaping(condition);
          });
          var inCondition = '(' + conditions['$in'].join(',') + ')';
          return inBuilder(
            conditions['$field'],
            currentTable,
            'IN',
            inCondition
          );
        } else {
          return null;
        }
      }
    }

    if (whereKeys.length == 1) {
      var result = conditionBuilder(
        whereKeys[0],
        inheritedTable!,
        '=',
        conditions[whereKeys[0]]
      );

      return result;
    }

    return null;
  };

  /**
   * Building SELECT expression
   * @param conditions
   * @param parentKey
   */
  var joinBuilder = function (
    joinData: any,
    curentTable: string,
    inheritedTable: string
  ) {
    var sqlJoin = '';

    var joinKeys = Object.keys(joinData);

    if (joinKeys.indexOf('$inner') >= 0) {
      sqlJoin += 'INNER JOIN ' + enclosure(joinData['$inner']) + ' ';
    } else if (joinKeys.indexOf('$left') >= 0) {
      sqlJoin += 'LEFT JOIN ' + enclosure(joinData['$left']) + ' ';
    } else if (joinKeys.indexOf('$right') >= 0) {
      sqlJoin += 'RIGHT JOIN ' + enclosure(joinData['$right']) + ' ';
    } else if (joinKeys.indexOf('$full') >= 0) {
      sqlJoin += 'FULL JOIN ' + enclosure(joinData['$full']) + ' ';
    }

    // if there is  $using
    if (joinKeys.indexOf('$using') >= 0) {
      sqlJoin += 'USING(' + enclosure(joinData['$using']) + ')';
      return sqlJoin;
    } else if (joinKeys.indexOf('$on') >= 0) {
      if (Array.isArray(joinData['$on'])) {
        let tempArray: string[] = [];

        joinData['$on'].forEach(function (item: Record<string, any>) {
          if (item.$parent && item.$child) {
            tempArray.push(
              enclosure(inheritedTable) +
                '.' +
                enclosure(item.$parent) +
                ' = ' +
                enclosure(curentTable) +
                '.' +
                enclosure(item.$child)
            );
          }
        });

        sqlJoin += 'ON (' + tempArray.join(' AND ') + ' )';
      } else {
        if (!joinData['$on'].$parent && !joinData['$on'].$child) {
          return null;
        }
        sqlJoin +=
          'ON ' +
          enclosure(inheritedTable) +
          '.' +
          enclosure(joinData['$on'].$parent) +
          ' = ' +
          enclosure(curentTable) +
          '.' +
          enclosure(joinData['$on'].$child);
      }
      return sqlJoin;
    } else {
      return null;
    }
  };

  var selectBuilder = function (
    conditions: any,
    inheritedTable: string | null
  ) {
    var byGroupOrOrder = function (
      conditions: any,
      selectObject: any,
      currentTable: string
    ) {
      let aliasesList = selectObject.aliases.map(function (
        x: Record<string, any>
      ) {
        return x['$as'];
      });

      let resultArray: string[] = [];

      conditions.forEach(function (orderItem: Record<string, any>) {
        // test if the array element is an object ( column descriptor ) or a simple string ( an column alias )
        if (typeof orderItem === 'object') {
          //if it is an object, must contain a $as or $field keys
          if (orderItem['$field']) {
            //it's a field
            resultArray.push(
              enclosure(
                orderItem['$table'] ? orderItem['$table'] : currentTable
              ) +
                '.' +
                enclosure(orderItem['$field']) +
                (orderItem['$desc'] ? ' DESC' : '')
            );
          } else if (orderItem['$as']) {
            var currentAliasIdx = aliasesList.indexOf(orderItem['$as']);
            if (currentAliasIdx >= 0) {
              // It's an alias
              resultArray.push(
                enclosure(selectObject.aliases[currentAliasIdx]['$table']) +
                  '.' +
                  enclosure(selectObject.aliases[currentAliasIdx]['$field']) +
                  (orderItem['$desc'] ? ' DESC' : '')
              );
            }
          }
          // // test if there is a $raw operator
          // else if (orderItem['$raw']) {
          //   resultArray.push(orderItem['$raw']);
          // }
        } else {
          // it is not an object. must be an alias or a top level table column name (will use $from table name)
          var currentAliasIdx = aliasesList.indexOf(orderItem);
          if (currentAliasIdx >= 0) {
            // It's an alias
            resultArray.push(
              enclosure(selectObject.aliases[currentAliasIdx]['$table']) +
                '.' +
                enclosure(selectObject.aliases[currentAliasIdx]['$field'])
            );
          } else {
            //It's a top level table column
            resultArray.push(
              enclosure(currentTable) + '.' + enclosure(orderItem)
            );
          }
        }
      });

      return resultArray;
    };

    let currentTable: string;
    let selectKeys = Object.keys(conditions);
    let selectObject: Record<string, any> = {
      select: [],
      from: [],
      aliases: [],
      groupBy: [],
      orderBy: [],
      having: [],
    };

    // Tests the conditions object keys to see what action is required (from, join, etc...)
    if (selectKeys.indexOf('$from') >= 0) {
      currentTable = conditions['$from'];
      selectObject.from.push('FROM ' + enclosure(currentTable));
    }

    if (selectKeys.indexOf('$inner') >= 0) {
      currentTable = conditions['$inner'];
      selectObject.from.push(
        joinBuilder(conditions, currentTable, inheritedTable!)
      );
    } else if (selectKeys.indexOf('$left') >= 0) {
      currentTable = conditions['$left'];
      selectObject.from.push(
        joinBuilder(conditions, currentTable, inheritedTable!)
      );
    } else if (selectKeys.indexOf('$right') >= 0) {
      currentTable = conditions['$right'];
      selectObject.from.push(
        joinBuilder(conditions, currentTable, inheritedTable!)
      );
    } else if (selectKeys.indexOf('$full') >= 0) {
      currentTable = conditions['$full'];
      selectObject.from.push(
        joinBuilder(conditions, currentTable, inheritedTable!)
      );
    }

    // Process the $where object
    if (selectKeys.indexOf('$where') >= 0) {
      // only process the $where object if it is not empty
      if (Object.keys(conditions['$where']).length > 0) {
        var whereObject = whereBuilder(
          conditions['$where'],
          null,
          currentTable!
        );
        if (whereObject) {
          // only add the result of whereBuilder if it has returned a value
          selectObject.where = whereObject;
        }
      }
    }

    // Process the $having object
    if (selectKeys.indexOf('$having') >= 0) {
      // only process the $where object if it is not empty
      if (Object.keys(conditions['$having']).length > 0) {
        var whereObject = whereBuilder(
          conditions['$having'],
          null,
          currentTable!
        );
        if (whereObject) {
          // only add the result of whereBuilder if it has returned a value
          selectObject.having = whereObject;
        }
      }
    }

    // Process all provided elements of fields Array
    if (conditions['$fields'] && conditions['$fields'].length > 0) {
      conditions['$fields'].forEach(function (field: Record<string, any>) {
        // Test if array element is an object
        if (typeof field === 'object') {
          // It's an object. Determine which kind of object

          var fieldKeys = Object.keys(field);

          // If it is a special operation that needs recursive call ( $inner, $left, $right )
          if (
            fieldKeys.indexOf('$inner') >= 0 ||
            fieldKeys.indexOf('$left') >= 0 ||
            fieldKeys.indexOf('$right') >= 0 ||
            fieldKeys.indexOf('$full') >= 0
          ) {
            let recursiveSelectObject = selectBuilder(field, currentTable);

            //After recursive call, add itens from recursive call into the current object
            recursiveSelectObject.select.forEach(function (item: string) {
              selectObject.select.push(item);
            });
            recursiveSelectObject.from.forEach(function (item: string) {
              selectObject.from.push(item);
            });

            // where is a string, and not an array. manualy concatenate
            if (recursiveSelectObject.where) {
              if (selectObject.where) {
                selectObject.where += ' AND ' + recursiveSelectObject.where;
              } else {
                selectObject.where = recursiveSelectObject.where;
              }
            }

            recursiveSelectObject.aliases.forEach(function (
              item: Record<string, any>
            ) {
              selectObject.aliases.push(item);
            });
          }
          // It is a field object
          else if (fieldKeys.indexOf('$field') >= 0) {
            let currentField: Record<string, any> = {};

            if (fieldKeys.indexOf('$table') >= 0) {
              currentField.sql =
                enclosure(field['$table']) + '.' + enclosure(field['$field']);
            } else {
              currentField.sql =
                enclosure(currentTable) + '.' + enclosure(field['$field']);
            }

            if (fieldKeys.indexOf('$avg') >= 0) {
              currentField.sql = 'AVG(' + currentField.sql + ')';
            } else if (fieldKeys.indexOf('$count') >= 0) {
              currentField.sql = 'COUNT(' + currentField.sql + ')';
            } else if (fieldKeys.indexOf('$lower') >= 0) {
              currentField.sql = 'LOWER(' + currentField.sql + ')';
            } else if (fieldKeys.indexOf('$max') >= 0) {
              currentField.sql = 'MAX(' + currentField.sql + ')';
            } else if (fieldKeys.indexOf('$min') >= 0) {
              currentField.sql = 'MIN(' + currentField.sql + ')';
            } else if (fieldKeys.indexOf('$sum') >= 0) {
              currentField.sql = 'SUM(' + currentField.sql + ')';
            } else if (fieldKeys.indexOf('$upper') >= 0) {
              currentField.sql = 'UPPER(' + currentField.sql + ')';
            }

            // if (fieldKeys.indexOf('$function') >= 0) {
            //   if (
            //     typeof field['$function'] == 'string' &&
            //     field['$function'].length > 0
            //   ) {
            //     currentField.function = field['$function'].toUpperCase();
            //     currentField.sql =
            //       currentField.function + '(' + currentField.sql + ')';
            //   }
            // }

            if (fieldKeys.indexOf('$as') >= 0) {
              currentField.as = field['$as'];
              currentField.sql = currentField.sql + ' AS ' + currentField.as;
              selectObject.aliases.push({
                $table: currentTable,
                $field: field['$field'],
                $as: field['$as'],
              });
            }

            // add the columm to the select object
            selectObject.select.push(currentField.sql);
          }
          // // test if there is a $raw operator
          // else if (fieldKeys.indexOf('$raw') >= 0) {
          //   selectObject.select.push(field['$raw']);
          // }
        } else {
          // raw field, add it to the select Object
          selectObject.select.push(
            enclosure(currentTable) + '.' + enclosure(field)
          );
        }
      });
    }

    // Process the $limit object
    if (selectKeys.indexOf('$limit') >= 0) {
      if (
        conditions['$limit']['$offset'] >= 0 &&
        conditions['$limit']['$rows'] >= 0
      ) {
        selectObject.limit =
          ' LIMIT ' +
          conditions['$limit']['$rows'] +
          ' OFFSET ' +
          conditions['$limit']['$offset'];
      }
    }

    // Process the $groupBy object
    if (selectKeys.indexOf('$group') >= 0) {
      selectObject.groupBy = byGroupOrOrder(
        conditions['$group'],
        selectObject,
        currentTable!
      );
    }

    // Process the $orderBy object
    if (selectKeys.indexOf('$order') >= 0) {
      selectObject.orderBy = byGroupOrOrder(
        conditions['$order'],
        selectObject,
        currentTable!
      );
    }

    return selectObject;
  };

  /**
   * Generate an UPDATE command based on params
   * @param queryParams
   * @returns {string} SQL Query
   */
  // @ts-ignore
  this.update = function (queryParams: any) {
    counter = 1;
    values = [];

    // test if required query params are provided
    if (!queryParams || !queryParams.$update || !queryParams.$set) return null;

    // UPDATE
    let sql = 'UPDATE ' + enclosure(queryParams.$update);

    // SET
    let setKeys = Object.keys(queryParams.$set);
    let setArray: string[] = [];

    setKeys.forEach(function (key) {
      setArray.push(enclosure(key) + ' = ' + escaping(queryParams.$set[key]));
    });

    sql += ' SET ' + setArray.join(',');

    if (queryParams.$where) {
      sql += ' WHERE ' + whereBuilder(queryParams.$where, null, null);
    }

    return { sql, values };
  };

  /**
   * Generate an INSERT command based on params
   * @param queryParams
   * @returns {string} SQL Query
   */
  // @ts-ignore
  this.insert = function (queryParams: any) {
    counter = 1;
    values = [];

    // test if required query params are provided
    if (!queryParams || !queryParams.$insert || !queryParams.$values)
      return null;

    // INSERT
    var sql = 'INSERT INTO ' + enclosure(queryParams.$insert);

    // KEYS
    var setKeys = Object.keys(queryParams.$values);

    let keysArray: string[] = [];
    setKeys.forEach(function (key: string) {
      keysArray.push(enclosure(key));
    });

    sql += ' (' + keysArray.join(',') + ')';

    // Values

    let valuesArray: string[] = [];
    setKeys.forEach(function (key: string) {
      valuesArray.push(escaping(queryParams.$values[key]));
    });

    sql += ' VALUES (' + valuesArray.join(',') + ')';

    return { sql, values };
  };

  /**
   * Generate an UPDATE command based on params
   * @param queryParams
   * @returns {string} SQL Query
   */
  // @ts-ignore
  this.delete = function (queryParams: any) {
    counter = 1;
    values = [];

    // test if required query params are provided
    if (!queryParams || !queryParams.$delete) return null;

    // DELETE
    var sql = 'DELETE FROM ' + enclosure(queryParams.$delete);

    if (queryParams.$where) {
      sql += ' WHERE ' + whereBuilder(queryParams.$where, null, null);
    }

    return { sql, values };
  };

  /**
   * Generate an SELECT command based on params
   * @param queryParams
   * @returns {string} SQL Query
   */
  // @ts-ignore
  this.select = function (queryParams: any) {
    counter = 1;
    values = [];

    // test if required query params are provided
    if (!queryParams || !queryParams.$from) return null;

    let sql = '';
    let selectObject = selectBuilder(queryParams, null);

    if (selectObject.select.length == 0 || selectObject.from.length == 0) {
      return null;
    }

    sql += 'SELECT';

    if (selectObject.select.length > 0) {
      sql += ' ' + selectObject.select.join(', ');
    }

    if (selectObject.from.length > 0) {
      sql += ' ' + selectObject.from.join(' ');
    }

    if (selectObject.where) {
      sql += ' WHERE ' + selectObject.where;
    }

    if (selectObject.groupBy.length > 0) {
      sql += ' GROUP BY ' + selectObject.groupBy.join(' ,');
    }

    if (selectObject.orderBy.length > 0) {
      sql += ' ORDER BY ' + selectObject.orderBy.join(' ,');
    }

    if (selectObject.having.length > 0) {
      sql += ' HAVING ' + selectObject.having;
    }

    if (selectObject.limit) {
      sql += selectObject.limit;
    }

    return { sql, values };
  };
};

module.exports = jsonToSql;
