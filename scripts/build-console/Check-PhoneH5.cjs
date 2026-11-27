/**
 * 联调 H5 发布后健康检查。由构建任务执行，只校验证书、静态路径和游戏 WebSocket 握手。
 * 不创建账号或提交游戏请求。
 */
const assert = require('node:assert/strict');
const { randomBytes, X509Certificate } = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');

const pageUrl = new URL(process.argv[2]);
const ca = new X509Certificate(fs.readFileSync(process.argv[3])).toString();
const protocol = 'mxzg.protobuf.v2';

/** 验证指定静态文件返回 HTTP 200，读取配置时同时返回正文。 */
function readStatic(url, readBody) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { ca, timeout: 5000 }, response => {
            let body = '';
            if (readBody) {
                response.setEncoding('utf8');
                response.on('data', part => {
                    body += part;
                    if (body.length > 256 * 1024) {
                        response.destroy(new Error('静态配置文件大小异常'));
                    }
                });
            } else {
                response.resume();
            }
            response.once('end', () => {
                if (response.statusCode === 200) {
                    resolve(body);
                } else {
                    reject(new Error('静态文件返回 HTTP ' + response.statusCode));
                }
            });
            response.once('error', reject);
        });
        request.once('error', reject);
        request.once('timeout', () => request.destroy(new Error('读取静态文件超时')));
    });
}

/** 从实际页面来源完成 WSS 升级，确认协商协议后断开。 */
function checkWebSocket() {
    return new Promise((resolve, reject) => {
        const socketUrl = new URL('/api/v1/game/socket', pageUrl);
        const request = https.request(socketUrl, {
            ca,
            timeout: 5000,
            headers: {
                Origin: pageUrl.origin,
                Connection: 'Upgrade',
                Upgrade: 'websocket',
                'Sec-WebSocket-Version': '13',
                'Sec-WebSocket-Key': randomBytes(16).toString('base64'),
                'Sec-WebSocket-Protocol': protocol,
            },
        });
        request.once('upgrade', (response, socket) => {
            socket.destroy();
            if (response.statusCode === 101 && response.headers['sec-websocket-protocol'] === protocol) {
                resolve();
            } else {
                reject(new Error('WebSocket 协议协商失败'));
            }
        });
        request.once('response', response => {
            response.resume();
            reject(new Error('WebSocket 返回 HTTP ' + response.statusCode));
        });
        request.once('error', reject);
        request.once('timeout', () => request.destroy(new Error('WebSocket 握手超时')));
        request.end();
    });
}

/** 确认前端资源地址和游戏服务的入口同源。 */
async function checkRelease() {
    const [, settingsJson] = await Promise.all([
        readStatic(pageUrl, false),
        readStatic(new URL('/src/settings.json', pageUrl), true),
        checkWebSocket(),
    ]);
    assert.equal(JSON.parse(settingsJson).assets.server, pageUrl.origin + '/', '资源地址必须指向当前测试服');
    console.log('[HEALTH] HTTPS 200，WebSocket 101。');
}

checkRelease().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
