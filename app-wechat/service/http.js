// 请求

var app = getApp();
var Constants = require('../utils/constants.js')//引入constants.js

//本地测试域名
var root = 'http://localhost:7001/weapp/';

function buildParams(url, data, cb) {
  var app = getApp();
  var userInfo = app.globalData.userInfo;

  return {
    platform: Constants.PLATFORM,
    userIdentity: Constants.USER_IDENTITY,
    merchantUuid: Constants.MERCHANT_UUID,
    nickName: userInfo ? userInfo.nickName : '',
  };
}

function buildFilter(arg) {
  var filter = {};
  arg = arg || {};
  filter.params = arg.params || {};
  filter.orders = arg.orders || [];
  filter.page = arg.page || 0;
  filter.pageSize = arg.pageSize || Constants.pageSize;
  filter.defaultPageSize = arg.defaultPageSize || 0;
  return filter;
}

function request(config, noLogin) {
  var sessionid = wx.getStorageSync('3rd_session');
  var header = sessionid ? { 'content-type': 'application/json', 'sessionid': sessionid } : { 'content-type': 'application/json' };

  if (!config.notLoading) wx.showLoading({ title: '加载中...' })

  wx.request({
    method: config.type || 'POST',
    url: root + config.url,
    data: config.data,
    header: header,
    success: (res) => {
      var info = res.data || {}
      if (info.errorCode === 0) {
        var success = config.success
        return typeof success === "function" && success(info.data || null, info.extendInfo);
      } else if (info.errorCode === 100) {
        //未登录或过期
        if (!noLogin) {
          login(() => {
            request(config, true)
          })
        }
      } else {
        var fail = config.fail

        if (typeof fail === "function") {
          fail(info);
        } else {
          wx.showModal({
            title: '提示',
            content: info.message || Constants.serviceErrorTip,
            showCancel: false
          })
        }
      }
    },
    fail: () => {
      wx.showModal({
        title: '提示',
        content: '网络异常',
        showCancel: false
      })
    },
    complete: () => {
      var complete = config.complete
      if (!config.notLoading) wx.hideLoading()
      return typeof complete === "function" && complete()
    }
  })
}

function login(cb) {
  var params = buildParams();

  wx.setStorageSync('3rd_session', '');
  wx.login({
    success: (res) => {
      var code = res.code;
      if (code) {
        params.code = code;

        request({
          type: 'POST',
          url: 'login',
          data: params,
          success: (res1) => {
            console.log(res1)
            wx.setStorageSync('3rd_session', res1);
            return typeof cb === "function" && cb();
          }
        })
      } else {
        wx.showModal({
          title: '获取用户登录态失败',
          content: 'res.errMsg',
          showCancel: false
        })
      }
    }
  });
}

module.exports = {
  buildFilter: buildFilter,
  buildParams: buildParams,
  request: request,
  login: login
}