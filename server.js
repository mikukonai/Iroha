
// Framework IROHA
// 调试用服务器

let http = require("http");
let fs = require("fs");
let url = require("url");

let CONFIG = {
    "portNumber": 8088,
    "MIME":{
        "css":   "text/css",
        "jpg":   "image/jpeg",
        "jpeg":  "image/jpeg",
        "png":   "image/png",
        "gif":   "image/gif",
        "bmp":   "image/bmp",
        "js":    "text/javascript",
        "ico":   "image/vnd.microsoft.icon",
        "mp3":   "audio/mpeg",
        "woff":  "application/x-font-woff",
        "woff2": "font/woff2",
        "ttf":   "application/x-font-truetype",
        "otf":   "application/x-font-opentype",
        "mp4":   "video/mp4",
        "webm":  "video/webm",
        "svg":   "image/svg+xml"
    },
};

// 日志
function LOG(status, message) {
    function FillZero(num, digits) { return `00000${num.toString()}`.substr(-digits); }
    let now = new Date();
    let datetime = `${now.getFullYear()}-${FillZero(now.getMonth()+1, 2)}-${FillZero(now.getDate(), 2)} ${FillZero(now.getHours(), 2)}:${FillZero(now.getMinutes(), 2)}:${FillZero(now.getSeconds(), 2)}.${FillZero(now.getMilliseconds(), 3)}`;
    console.log(`[${status}] ${datetime} ${message}`);
}

// 响应
function Write(response, statusCode, contentType, content) {
    response.writeHead(statusCode, {"Content-Type": contentType});
    response.write(content);
    response.end();
}

// 读取文件系统，并响应
function ReadFile(response, reqPath) {
    fs.readFile(reqPath, (err, data) => {
        let content;
        if(err) {
            fs.readFile("404.html", (err, data) => {
                if(err) content = `<head><meta charset="utf-8"/></head><h1>真·404</h1>`;
                else content = data.toString();
                LOG("404", `失败：${reqPath}`);
                Write(response, 404, "text/html", content);
            });
        }
        else {
            content = data.toString();
            let mimeType = "text/html";
            for(let suffix in CONFIG.MIME) { // 根据后缀，检查MIME
                if(new RegExp("\." + suffix + "$", "gi").test(reqPath)) {
                    mimeType = CONFIG.MIME[suffix];
                    if(/^text\//gi.test(mimeType)) content = data.toString();
                    else content = data;
                }
            }
            LOG("200", `成功：${reqPath}`);
            Write(response, 200, mimeType, content);
        }
    });
}

// 启动HTTP服务器
http.createServer((request, response) => {
    request.on("data", (chunk) => { /**/ });
    request.on("end", () => {
        // 解析请求
        let reqPath = url.parse(request.url).pathname.substr(1);
        if(reqPath === "") { // 默认主页
            ReadFile(response, "index.html");
        }
        else {
            ReadFile(response, decodeURI(reqPath));
        }
    });
}).listen(CONFIG.portNumber);

LOG("   ", `服务器已启动。端口号：${CONFIG.portNumber}`);
