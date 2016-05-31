'use strict';

var fs = require('fs');
var path = require('path');
var highlightJs = require('highlight.js');
var assign = require('object-assign');
var packageUtil = require('./packageUtil');
var cwd = process.cwd();
var pkg = require(path.join(cwd, 'package.json'));
var srcPath = new RegExp('(["\']' + pkg.name + ')\/src\/', 'g');
var internalIp = require('internal-ip');
var request = require('koa-request');

function replaceSrcToLib(modName) {
  return modName.replace(srcPath, function (m, m1) {
    return m1 + '/lib/';
  });
}

function transformJsForRender(code, jsName) {
  const addr = `//${internalIp()}:${pkg.config.port}/examples/${jsName}.html`;
  return `<script src="https://os.alipayobjects.com/rmsportal/NrsdrrVhDIJnPUm.js"></script>
<div id="qrcode"></div>
    <script>document.getElementById("qrcode").appendChild(new AraleQRCode({text: location.protocol + '${addr}'}))</script>
  <div class="highlight">
  <pre><code>${highlightJs.highlightAuto(replaceSrcToLib(code)).value }</code></pre>
  </div>`;
}

module.exports = function () {
  return function*(next) {
    var pathname = this.path;
    if (pathname.match(/\.html$/)) {
      var filePath = path.join(process.cwd(), pathname);
      if (fs.existsSync(filePath)) {
        var content = fs.readFileSync(filePath, {
          encoding: 'utf-8'
        }).trim();
        if (content && content !== 'placeholder') {
          yield *next;
          return;
        }
      }
      var jsName;
      var jsPath = pathname.replace(/\.html$/, '.js');
      jsName = path.basename(jsPath, '.js');
      var jsFile = path.join(process.cwd(), jsPath);
      if (!fs.existsSync(jsFile)) {
        jsFile = path.join(process.cwd(), pathname.replace(/\.html$/, '.jsx'));
      }
      if (!fs.existsSync(jsFile)) {
        jsFile = path.join(process.cwd(), pathname.replace(/\.html$/, '.tsx'));
      }
      const response = yield request({
        url: `http://localhost:${pkg.config.port}/examples/${jsName}.css`,
      });
      const hasCss = response.statusCode === 200;
      var code = fs.readFileSync(jsFile, {
        encoding: 'utf-8'
      });
      yield this.render('js2html', assign({
        name: jsName,
        hasCss,
        pkg,
        query: this.query,
        content: transformJsForRender(code, jsName)
      }, packageUtil.getPackages()));
    } else {
      yield *next;
    }
  };
};
