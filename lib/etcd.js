var async = require('async');
var cache = require('memory-cache');
var CronJob = require('cron').CronJob;
var Etcd = require('node-etcd');
var log = require('./logger')();

var api = module.exports = {};

api.init = function init(config, callback) {
  if(!config) {
    callback(new Error('Cannot create etcd. No config provided'));
  }
  if(!config.host) {
    callback(new Error('Cannot create etcd. No host provided'));
  }
  if(!config.port) {
    callback(new Error('Cannot create etcd. No port provided'));
  }

  var etcd = this;
  etcd.ec = new Etcd(config.host, config.port);
  etcd.canGetKeys = true;

  callback(null);
};

api.startCron = function startCron(callback) {
  var etcd = this;
  new CronJob('*/5 * * * * *', function() {
    if(etcd.canGetKeys) {
      log.debug('canGetKeys CronJob fired, making request');
      etcd.canGetKeys = false;
      api.getKeys(function() {
        etcd.canGetKeys = true;
      });
    }
    else {
      log.warn('canGetKeys CronJob fired, but last request still pending');
    }
  }, null, true);

  callback(null);
};

api.getKeys = function getKeys(callback) {
  var etcd = this;
  etcd.ec.raw('GET', 'v2/keys/', null, {recursive: true, sorted: true}, function(err, keys) {
    if(err) {
      log.error({err: err}, 'Error - Etcd: getKeys');
      cache.del('keys');
    }
    else if(keys && keys.node && keys.node.nodes) {
      log.debug({data: keys.node.nodes}, 'Etcd: getKeys');
      cache.put('keys', keys.node.nodes);
    }
    callback(null);
  });
};
