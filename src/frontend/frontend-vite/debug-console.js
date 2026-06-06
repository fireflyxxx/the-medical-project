// 在浏览器控制台运行这些命令来调试

// 1. 查看原始推理结果
console.log('=== Raw Inference Results ===');
// 应该能在控制台历史中找到

// 2. 查看解析后的结果
console.log('=== Parsed Results ===');
// 应该能在控制台历史中找到

// 3. 查看最终的 imageMap
console.log('=== Final ImageMap ===');
// 应该能在控制台历史中找到

// 4. 手动测试图片路径转换
const testPath = "/uploads/test.jpg";
const API_BASE = "";
const toImageSrc = (raw) => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('data:image/')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/${value.replace(/^\.?\//, '')}`;
};
console.log('Test path conversion:', toImageSrc(testPath));
