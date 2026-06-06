import { useState, useEffect } from 'react';
import request from '../utils/request';
import { useNavigate } from 'react-router-dom';

export default function DebugPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any>(null);
  const [images, setImages] = useState<any>(null);
  const [inferResults, setInferResults] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>('');
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    const storedRole = sessionStorage.getItem('role');
    setToken(storedToken || '');
    setRole(storedRole || '');

    if (!storedToken) {
      setError('未登录：请先登录系统后再访问此页面');
    }
  }, []);

  const fetchData = async () => {
    if (!sessionStorage.getItem('token')) {
      setError('未登录：请先登录系统');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 获取病例数据
      const casesData = await request.get('/api/v1/cases/get');
      setCases(casesData);
      console.log('Cases:', casesData);

      // 获取所有图片
      try {
        const imagesData = await request.get('/api/v1/image/get');
        setImages(imagesData);
        console.log('Images:', imagesData);
      } catch (e: any) {
        console.warn('获取图片失败:', e.message);
      }

      // 获取推理结果
      try {
        const inferData = await request.get('/api/v1/infer_result/get');
        setInferResults(inferData);
        console.log('Infer Results:', inferData);
      } catch (e: any) {
        console.warn('获取推理结果失败:', e.message);
      }
    } catch (err: any) {
      setError(err.message || '获取数据失败');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const testImageUrl = (path: string) => {
  if (!path || path === 'null') return '';
  
  // 1. 如果是完整路径，直接返回
  if (path.startsWith('http')) return path;

  // 2. 获取基础路径
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

  // 3. 拼接
  // 先不管三七二十一，直接把它们拼在一起，中间加个斜杠
  const rawUrl = `${baseUrl}/${path}`;

  // 4. 【核心修复】：斜杠粉碎机
  // 使用正则表达式，把 2 个或多个连续的斜杠替换为 1 个斜杠
  // 注意：我们要保护好 http:// 这种开头的双斜杠
  let cleanUrl = rawUrl.replace(/\/+/g, '/');

  // 如果 baseUrl 包含 http://，刚才正则会把 http:// 变成 http:/，这里要修补回来
  if (rawUrl.includes('://')) {
    cleanUrl = cleanUrl.replace(':/', '://');
  }

  return cleanUrl;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">数据诊断页面</h1>

      {!token && (
        <div className="mb-6 p-6 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
          <h2 className="text-xl font-bold mb-2">⚠️ 未登录</h2>
          <p className="mb-4">请先登录系统后再访问此页面</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            前往登录
          </button>
        </div>
      )}

      {token && (
        <>
          <button
            onClick={fetchData}
            disabled={loading}
            className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? '加载中...' : '刷新数据'}
          </button>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              错误: {error}
            </div>
          )}
        </>
      )}

      {/* 病例数据 */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">病例数据 (Cases)</h2>
        <div className="mb-4">
          <strong>数据类型:</strong> {Array.isArray(cases) ? '数组' : typeof cases}
        </div>
        <div className="mb-4">
          <strong>病例数量:</strong> {Array.isArray(cases) ? cases.length : '非数组'}
        </div>
        {Array.isArray(cases) && cases.length > 0 && (
          <div>
            <h3 className="font-bold mb-2">第一个病例:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(cases[0], null, 2)}
            </pre>
          </div>
        )}
        {(!cases || (Array.isArray(cases) && cases.length === 0)) && (
          <div className="text-red-600">⚠️ 没有病例数据</div>
        )}
      </div>

      {/* 图片数据 */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">图片数据 (Images)</h2>
        <div className="mb-4">
          <strong>数据类型:</strong> {Array.isArray(images) ? '数组' : typeof images}
        </div>
        <div className="mb-4">
          <strong>图片数量:</strong> {Array.isArray(images) ? images.length : '非数组'}
        </div>
        {Array.isArray(images) && images.length > 0 && (
          <div>
            <h3 className="font-bold mb-2">第一张图片:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 mb-4">
              {JSON.stringify(images[0], null, 2)}
            </pre>
            {images[0]?.image_path && (
              <div>
                <h3 className="font-bold mb-2">图片预览:</h3>
                <p className="mb-2">路径: {images[0].image_path}</p>
                <p className="mb-2">完整URL: {testImageUrl(images[0].image_path)}</p>
                <img
                  src={testImageUrl(images[0].image_path)}
                  alt="测试图片"
                  className="max-w-md border"
                  onError={(e) => {
                    console.error('图片加载失败:', images[0].image_path);
                    (e.target as HTMLImageElement).style.border = '2px solid red';
                  }}
                  onLoad={() => console.log('图片加载成功:', images[0].image_path)}
                />
              </div>
            )}
          </div>
        )}
        {(!images || (Array.isArray(images) && images.length === 0)) && (
          <div className="text-red-600">⚠️ 没有图片数据</div>
        )}
      </div>

      {/* 推理结果数据 */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">推理结果 (Inference Results)</h2>
        <div className="mb-4">
          <strong>数据类型:</strong> {Array.isArray(inferResults) ? '数组' : typeof inferResults}
        </div>
        <div className="mb-4">
          <strong>结果数量:</strong> {Array.isArray(inferResults) ? inferResults.length : '非数组'}
        </div>
        {Array.isArray(inferResults) && inferResults.length > 0 && (
          <div>
            <h3 className="font-bold mb-2">第一个推理结果:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(inferResults[0], null, 2)}
            </pre>
          </div>
        )}
        {(!inferResults || (Array.isArray(inferResults) && inferResults.length === 0)) && (
          <div className="text-red-600">⚠️ 没有推理结果数据</div>
        )}
      </div>

      {/* 环境信息 */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">环境信息</h2>
        <div className="space-y-2">
          <div><strong>开发模式:</strong> {import.meta.env.DEV ? '是' : '否'}</div>
          <div><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || '未设置'}</div>
          <div><strong>当前 Token:</strong> {token ? '已设置 ✅' : '未设置 ❌'}</div>
          <div><strong>当前角色:</strong> {role || '未设置'}</div>
          {token && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <strong>Token 值:</strong>
              <div className="text-xs break-all mt-1">{token}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
