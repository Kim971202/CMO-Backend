// 페이지네이션
const pagination = function (totalCount, countPerPage, pageSize, pageNo) {
  // 페이지 크기
  if (
    countPerPage == undefined ||
    typeof countPerPage == "undefined" ||
    countPerPage == null
  ) {
    countPerPage = 10;
  } else {
    countPerPage = parseInt(countPerPage);
    if (isNaN(countPerPage) || countPerPage <= 0 || countPerPage > 1000) {
      countPerPage = 10;
    }
  }
  // 페이지 사이즈
  if (
    pageSize == undefined ||
    typeof pageSize == "undefined" ||
    pageSize == null
  ) {
    pageSize = 10;
  } else {
    pageSize = parseInt(pageSize);
    if (isNaN(pageSize) || pageSize <= 0 || pageSize > 100) {
      pageSize = 10;
    }
  }
  // 페이지 번호
  if (pageNo == undefined || typeof pageNo == "undefined" || pageNo == null) {
    pageNo = 1;
  } else {
    pageNo = parseInt(pageNo);
    if (isNaN(pageNo) || pageNo <= 0) {
      pageNo = 1;
    }
  }

  // 페이지네이션 정보
  var paginationInfo = {};

  // 마지막 페이지 번호(전체 페이지 크기)
  var lastPageNo =
    Math.floor(totalCount / countPerPage) +
    (totalCount % countPerPage == 0 ? 0 : 1);
  // 시작 페이지 번호
  var startPageNo = 1;
  // 페이지 사이즈로 페이지 번호를 나눈 몫만큼 페이지 시작 번호 변경
  var start = Math.floor(pageNo / pageSize);
  if (start >= 1) {
    // 그렇지만 나머지가 없으면 현재 페이지 번호가 마지막 페이지 번호와 같아 감소
    if (pageNo % pageSize == 0) {
      start--;
    }
    startPageNo = start * pageSize + 1;
  }
  // 종료 페이지 번호
  var endPageNo = startPageNo - 1 + pageSize;
  // 그렇지만 종료 페이지 번호가 마지막 페이지 번호보다 크면 마지막 페이지 번호로 변경
  if (endPageNo > lastPageNo) {
    endPageNo = lastPageNo;
  }
  // 이전 페이지 번호 활성화 여부
  var enablePrevPageNo = true;
  if (pageNo - 1 == 0) {
    enablePrevPageNo = false;
  }
  // 다음 페이지 번호 활성화 여부
  var enableNextPageNo = true;
  if (pageNo + 1 > lastPageNo) {
    enableNextPageNo = false;
  }
  // 이전 페이지 사이즈 번호
  var prevPageSizeNo = startPageNo - 1;
  // 이전 페이지 사이즈 번호 활성화 여부
  var enablePrevPageSizeNO = true;
  if (prevPageSizeNo == 0) {
    enablePrevPageSizeNO = false;
  }
  // 다음 페이지 사이즈 번호
  var nextPageSizeNo = endPageNo + 1;
  // 다음 페이지 사이즈 번호 활성화 여부
  var enableNextPageSizeNO = true;
  if (nextPageSizeNo > lastPageNo) {
    enableNextPageSizeNO = false;
  }

  // 페이지네이션 정보
  paginationInfo.totalCount = totalCount;
  paginationInfo.countPerPage = countPerPage;
  paginationInfo.pageSize = pageSize;
  paginationInfo.startPageNo = startPageNo;
  paginationInfo.endPageNo = endPageNo;
  paginationInfo.lastPageNo = lastPageNo;
  paginationInfo.pageNo = pageNo;
  paginationInfo.enablePrevPageNo = enablePrevPageNo;
  paginationInfo.enableNextPageNo = enableNextPageNo;
  paginationInfo.prevPageSizeNo = prevPageSizeNo;
  paginationInfo.enablePrevPageSizeNO = enablePrevPageSizeNO;
  paginationInfo.nextPageSizeNo = nextPageSizeNo;
  paginationInfo.enableNextPageSizeNO = enableNextPageSizeNO;

  return paginationInfo;
};

module.exports = pagination;
