// Quản lý tài chính – máy chủ CHỈ LẤY GIÁ chứng chỉ quỹ (không chứa dữ liệu cá nhân, không cần Google Sheets).
// Cách dùng: vào script.google.com > Dự án mới > dán toàn bộ file này > chạy hàm capQuyen một lần (Cho phép)
// > Triển khai > Triển khai mới > Ứng dụng web > Thực thi: Tôi, Người có quyền truy cập: Bất kỳ ai.
// Gửi địa chỉ ứng dụng web (https://script.google.com/macros/s/.../exec) cho người dùng app, họ nhập ở Khác > Nguồn giá quỹ.
// Cập nhật sau này: Quản lý các bản triển khai > ✏️ > Phiên bản mới (giữ nguyên địa chỉ).
var VERSION = 1;

function doGet(e) {
  var raw = String((e && e.parameter && e.parameter.codes) || '');
  var codes = raw ? raw.split(',') : [];
  try {
    return out_(navs_(codes));
  } catch (err) {
    return out_({ ok: false, err: String(err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Giá chứng chỉ quỹ từ fmarket.vn ----------
// Chạy hàm capQuyen() một lần trong trình soạn thảo để cấp quyền gọi ra ngoài (UrlFetchApp).
function capQuyen() {
  var r = navs_(['DCBF']);
  Logger.log(JSON.stringify(r));
  return r;
}

function navs_(codes) {
  var seen = {};
  codes = (codes || []).map(function (c) { return String(c).toUpperCase(); })
    .filter(function (c) { if (!/^[A-Z0-9._-]{2,16}$/.test(c) || seen[c]) return false; seen[c] = 1; return true; })
    .slice(0, 30);
  var cache = CacheService.getScriptCache();
  var navs = {}, errs = {};
  codes.forEach(function (code) {
    var hit = cache.get('nav_' + code);
    if (hit) { navs[code] = JSON.parse(hit); return; }
    try {
      var r = fetchNav_(code);
      navs[code] = r;
      cache.put('nav_' + code, JSON.stringify(r), 900);
    } catch (err) {
      errs[code] = String(err.message || err).slice(0, 160);
    }
  });
  return { ok: true, navs: navs, errs: errs, sv: VERSION };
}

function fetchNav_(code) {
  var body = {
    types: ['NEW_FUND', 'TRADING_FUND'], issuerIds: [], sortOrder: 'DESC', sortField: 'navTo6Months',
    page: 1, pageSize: 20, isIpo: false, fundAssetTypes: [], bondRemainPeriods: [],
    searchField: code, isBuyByReward: false, thirdAppIds: []
  };
  var res = UrlFetchApp.fetch('https://api.fmarket.vn/res/products/filter', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(body),
    muteHttpExceptions: true, headers: { Accept: 'application/json' }
  });
  var st = res.getResponseCode();
  if (st !== 200) throw new Error('HTTP ' + st);
  return pickNav_(JSON.parse(res.getContentText()), code);
}

// Tách giá từ dữ liệu fmarket (đọc linh hoạt vì chưa có tài liệu chính thức)
function pickNav_(json, code) {
  var data = (json && json.data) || json || {};
  var rows = data.rows || data.items || data.content || (Array.isArray(data) ? data : []);
  var row = null;
  for (var i = 0; i < rows.length; i++) {
    var rc = String(rows[i].shortName || rows[i].code || rows[i].productCode || '').toUpperCase();
    if (rc === code) { row = rows[i]; break; }
  }
  if (!row) throw new Error('không tìm thấy mã ' + code);
  var nav = Number(row.nav || row.navPrice || row.lastNav || row.currentNav);
  if (!(nav > 0)) throw new Error('không đọc được trường giá, các trường có: ' + Object.keys(row).slice(0, 14).join(','));
  var raw = row.lastNavDate || row.navDate || row.navUpdatedAt || row.lastNavAt || row.updateAt || '';
  var date = '';
  if (typeof raw === 'number') date = Utilities.formatDate(new Date(raw), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  else if (/^\d{4}-\d{2}-\d{2}/.test(String(raw))) date = String(raw).slice(0, 10);
  var type = (row.dataFundAssetType && row.dataFundAssetType.name) || row.fundType || row.type || '';
  return { nav: nav, date: date, name: row.name || '', type: String(type) };
}
