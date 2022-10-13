// 필터
const filter = {
  // 비교 필터
  compareFilter: function (
    element,
    columnName,
    compareCondition,
    compareValue
  ) {
    var result = false;
    if (typeof element[columnName] == "string") {
      // 문자열 비교
      if (compareCondition == "eq") {
        result = element[columnName] == compareValue;
      } else if (compareCondition == "ei") {
        result =
          element[columnName].toUpperCase() == compareValue.toUpperCase();
      } else if (compareCondition == "ne") {
        result = element[columnName] != compareValue;
      }
    } else if (typeof element[columnName] == "number") {
      // 숫자 비교
      if (compareCondition == "eq") {
        result = element[columnName] == compareValue;
      } else if (compareCondition == "lt") {
        result = element[columnName] < compareValue;
      } else if (compareCondition == "le") {
        result = element[columnName] <= compareValue;
      } else if (compareCondition == "gt") {
        result = element[columnName] > compareValue;
      } else if (compareCondition == "ge") {
        result = element[columnName] >= compareValue;
      } else if (compareCondition == "ne") {
        result = element[columnName] != compareValue;
      }
    }
    return result;
  },
  // 필터링
  filtering: function (condition, arrayList) {
    // 필터된 배열
    var filtered = [];
    // 반복 카운트
    var loopCount = 0;

    // 필터 제외
    const excludeFilter = ["countperpage", "pageno", "pagesize", "sortby"];
    // 필터 (Key=value)
    for (conditionName in condition) {
      if (!excludeFilter.includes(conditionName.toLowerCase())) {
        // 대상 칼럼 명
        var columnName = conditionName;
        // 비교문
        var compareCondition = "eq";
        // 비교값
        var compareValue = condition[columnName];
        if (typeof compareValue == "string") {
          var pos = compareValue.indexOf(":");
          if (pos > 0) {
            compareCondition = compareValue.substr(0, pos);
            compareValue = compareValue.substring(pos + 1);
          }
          if (loopCount == 0) {
            filtered = arrayList.filter(function (element) {
              return filter.compareFilter(
                element,
                columnName,
                compareCondition,
                compareValue
              );
            });
          } else {
            filtered = filtered.filter(function (element) {
              return filter.compareFilter(
                element,
                columnName,
                compareCondition,
                compareValue
              );
            });
          }
          loopCount++;
        } else if (Array.isArray(compareValue)) {
          for (var index = 0; index < compareValue.length; index++) {
            // 비교문
            var arCompareCondition = "eq";
            // 비교값
            var arCompareValue = compareValue[index];
            var pos = arCompareValue.indexOf(":");
            if (pos > 0) {
              arCompareCondition = arCompareValue.substr(0, pos);
              arCompareValue = arCompareValue.substring(pos + 1);
            }
            if (loopCount == 0) {
              filtered = arrayList.filter(function (element) {
                return filter.compareFilter(
                  element,
                  columnName,
                  arCompareCondition,
                  arCompareValue
                );
              });
            } else {
              filtered = filtered.filter(function (element) {
                return filter.compareFilter(
                  element,
                  columnName,
                  arCompareCondition,
                  arCompareValue
                );
              });
            }
            loopCount++;
          }
        }
        if (filtered.length == 0) {
          break;
        }
      }
    }

    if (loopCount == 0) {
      filtered = arrayList;
    }

    return filtered;
  },
};

module.exports = filter;
