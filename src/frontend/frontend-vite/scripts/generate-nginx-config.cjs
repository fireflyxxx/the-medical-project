const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const templatePath = path.resolve(__dirname, '../../nginx-1.26.3/conf/nginx.conf.template');
const outputPath = path.resolve(__dirname, '../../nginx-1.26.3/conf/nginx.conf');

const envContent = fs.readFileSync(envPath, 'utf-8');

// 1. 获取匹配的值
let apiBaseUrl = envContent.match(/VITE_API_BASE_URL=(.*)/)?.[1]?.trim();

// 2. 核心修复：如果没匹配到，或者匹配到的是空字符串，使用内部 Docker 后端
if (!apiBaseUrl || apiBaseUrl === '/') {
    apiBaseUrl = 'http://medical-app:8080/'; // 服务器上 nginx 通过 Docker 内网连后端
}

const template = fs.readFileSync(templatePath, 'utf-8');
const config = template.replace(/\{\{VITE_API_BASE_URL\}\}/g, apiBaseUrl);
fs.writeFileSync(outputPath, config, 'utf-8');
console.log(`✅ Nginx 配置已生成: ${outputPath}`);
console.log(`   后端地址: ${apiBaseUrl}`);
