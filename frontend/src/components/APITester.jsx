import React, { useState } from 'react';
import { Send, Plus, Trash2, FolderOpen, Clock, ChevronDown, ChevronRight, Copy, Check, X, LogIn, LogOut, Loader2 } from 'lucide-react';

const JsonHighlight = ({ data }) => {
  const syntaxHighlight = (json) => {
    if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-orange-400';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-purple-400';
        else cls = 'text-green-400';
      } else if (/true|false/.test(match)) cls = 'text-blue-400';
      else if (/null/.test(match)) cls = 'text-gray-500';
      return `<span class="${cls}">${match}</span>`;
    });
  };
  return <pre className="text-sm overflow-auto" dangerouslySetInnerHTML={{ __html: syntaxHighlight(data) }} />;
};

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const methodColors = { GET: 'bg-green-500', POST: 'bg-yellow-500', PUT: 'bg-blue-500', DELETE: 'bg-red-500', PATCH: 'bg-purple-500' };

export default function APITester() {
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json', enabled: true }]);
  const [params, setParams] = useState([{ key: '', value: '', enabled: true }]);
  const [body, setBody] = useState('{\n  "title": "Test",\n  "body": "Hello World",\n  "userId": 1\n}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('params');
  const [responseTab, setResponseTab] = useState('body');
  const [history, setHistory] = useState([]);
  const [collections, setCollections] = useState([{ id: 1, name: 'My Collection', requests: [] }]);
  const [showCollections, setShowCollections] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [expandedCols, setExpandedCols] = useState({ 1: true });
  const [newColName, setNewColName] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const activeHeaders = {};
      headers.filter(h => h.enabled && h.key).forEach(h => activeHeaders[h.key] = h.value);
      let finalUrl = url;
      const activeParams = params.filter(p => p.enabled && p.key);
      if (activeParams.length > 0) {
        const sp = new URLSearchParams();
        activeParams.forEach(p => sp.append(p.key, p.value));
        finalUrl += (url.includes('?') ? '&' : '?') + sp.toString();
      }
      const opts = { method, headers: activeHeaders };
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) opts.body = body;
      const res = await fetch(finalUrl, opts);
      const endTime = Date.now();
      const resHeaders = {};
      res.headers.forEach((v, k) => resHeaders[k] = v);
      let resBody;
      const ct = res.headers.get('content-type');
      resBody = ct?.includes('application/json') ? await res.json() : await res.text();
      const result = { status: res.status, statusText: res.statusText, time: endTime - startTime, headers: resHeaders, body: resBody, size: JSON.stringify(resBody).length };
      setResponse(result);
      const histItem = { id: Date.now(), url: finalUrl, method, timestamp: new Date().toISOString(), headers: [...headers], params: [...params], body, response: result };
      setHistory(prev => [histItem, ...prev.slice(0, 49)]);
    } catch (err) {
      setResponse({ status: 0, statusText: 'Error', time: Date.now() - startTime, body: { error: err.message }, headers: {} });
    }
    setLoading(false);
  };

  const addKV = (setter) => setter(prev => [...prev, { key: '', value: '', enabled: true }]);
  const updateKV = (setter, i, field, val) => setter(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const removeKV = (setter, i) => setter(prev => prev.filter((_, idx) => idx !== i));

  const saveToCol = (colId) => {
    const req = { id: Date.now(), url, method, headers: [...headers], params: [...params], body, name: url.split('/').pop() || 'Request' };
    setCollections(prev => prev.map(c => c.id === colId ? { ...c, requests: [...c.requests, req] } : c));
  };

  const loadReq = (req) => { setUrl(req.url); setMethod(req.method); if (req.headers) setHeaders(req.headers); if (req.params) setParams(req.params); if (req.body) setBody(req.body); };
  const copyRes = () => { navigator.clipboard.writeText(JSON.stringify(response?.body, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleAuth = () => { setUser({ email: authEmail, id: Date.now() }); setShowAuth(false); setAuthEmail(''); setAuthPass(''); };
  const createCol = () => { if (newColName.trim()) { const id = Date.now(); setCollections(prev => [...prev, { id, name: newColName, requests: [] }]); setExpandedCols(p => ({ ...p, [id]: true })); setNewColName(''); setShowNewCol(false); } };
  const deleteCol = (id) => setCollections(prev => prev.filter(c => c.id !== id));
  const deleteReq = (colId, reqId) => setCollections(prev => prev.map(c => c.id === colId ? { ...c, requests: c.requests.filter(r => r.id !== reqId) } : c));
  const getStatusColor = (s) => { if (s >= 200 && s < 300) return 'text-green-400'; if (s >= 300 && s < 400) return 'text-yellow-400'; if (s >= 400) return 'text-red-400'; return 'text-gray-400'; };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">API Tester</h1>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{user.email.split('@')[0]}</span>
              <button onClick={() => setUser(null)} className="p-1 hover:bg-gray-800 rounded"><LogOut size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className="p-2 hover:bg-gray-800 rounded"><LogIn size={18} /></button>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-3">
            <button onClick={() => setShowCollections(!showCollections)} className="flex items-center gap-2 text-sm font-medium text-gray-300 w-full hover:text-white">
              {showCollections ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <FolderOpen size={16} /> Collections
            </button>
            {showCollections && (
              <div className="mt-2 space-y-1">
                {collections.map(col => (
                  <div key={col.id} className="ml-2">
                    <div className="flex items-center gap-1 group">
                      <button onClick={() => setExpandedCols(p => ({ ...p, [col.id]: !p[col.id] }))} className="p-1">
                        {expandedCols[col.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <span className="text-sm flex-1 truncate">{col.name}</span>
                      <button onClick={() => saveToCol(col.id)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-green-400" title="Save current request"><Plus size={14} /></button>
                      <button onClick={() => deleteCol(col.id)} className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                    {expandedCols[col.id] && col.requests.map(req => (
                      <div key={req.id} className="ml-6 flex items-center gap-2 py-1 group cursor-pointer hover:bg-gray-800 rounded px-2" onClick={() => loadReq(req)}>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${methodColors[req.method]} text-white font-medium`}>{req.method.slice(0, 3)}</span>
                        <span className="text-xs text-gray-400 truncate flex-1">{req.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteReq(col.id, req.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                ))}
                {showNewCol ? (
                  <div className="ml-2 flex gap-1 mt-2">
                    <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Name" className="flex-1 bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700 focus:border-purple-500 outline-none" onKeyDown={e => e.key === 'Enter' && createCol()} autoFocus />
                    <button onClick={createCol} className="p-1 hover:bg-gray-700 rounded text-green-400"><Check size={16} /></button>
                    <button onClick={() => setShowNewCol(false)} className="p-1 hover:bg-gray-700 rounded text-red-400"><X size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewCol(true)} className="ml-2 mt-2 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"><Plus size={14} /> New Collection</button>
                )}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-800">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm font-medium text-gray-300 w-full hover:text-white">
              {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Clock size={16} /> History ({history.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1 max-h-64 overflow-auto">
                {history.map(item => (
                  <div key={item.id} onClick={() => loadReq(item)} className="ml-2 flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-800 rounded px-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${methodColors[item.method]} text-white font-medium`}>{item.method.slice(0, 3)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 truncate">{item.url}</div>
                      <div className="text-xs text-gray-600">{new Date(item.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <span className={`text-xs ${getStatusColor(item.response?.status)}`}>{item.response?.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex gap-2">
            <select value={method} onChange={e => setMethod(e.target.value)} className={`${methodColors[method]} text-white font-bold px-4 py-2.5 rounded-lg outline-none cursor-pointer`}>
              {methods.map(m => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
            </select>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter request URL" className="flex-1 bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-sm" onKeyDown={e => e.key === 'Enter' && sendRequest()} />
            <button onClick={sendRequest} disabled={loading} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Send
            </button>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
            <div className="flex border-b border-gray-800 bg-gray-900/30">
              {['params', 'headers', 'body'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium capitalize ${activeTab === tab ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}>
                  {tab} {tab === 'params' && params.filter(p => p.key).length > 0 && `(${params.filter(p => p.key).length})`}
                  {tab === 'headers' && headers.filter(h => h.key).length > 0 && `(${headers.filter(h => h.key).length})`}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {activeTab === 'params' && (
                <div className="space-y-2">
                  {params.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="checkbox" checked={p.enabled} onChange={e => updateKV(setParams, i, 'enabled', e.target.checked)} className="accent-purple-500" />
                      <input value={p.key} onChange={e => updateKV(setParams, i, 'key', e.target.value)} placeholder="Key" className="flex-1 bg-gray-800 px-3 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm" />
                      <input value={p.value} onChange={e => updateKV(setParams, i, 'value', e.target.value)} placeholder="Value" className="flex-1 bg-gray-800 px-3 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm" />
                      <button onClick={() => removeKV(setParams, i)} className="p-2 hover:bg-gray-800 rounded text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button onClick={() => addKV(setParams)} className="text-sm text-gray-400 hover:text-purple-400 flex items-center gap-1"><Plus size={16} /> Add Parameter</button>
                </div>
              )}
              {activeTab === 'headers' && (
                <div className="space-y-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="checkbox" checked={h.enabled} onChange={e => updateKV(setHeaders, i, 'enabled', e.target.checked)} className="accent-purple-500" />
                      <input value={h.key} onChange={e => updateKV(setHeaders, i, 'key', e.target.value)} placeholder="Header" className="flex-1 bg-gray-800 px-3 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm" />
                      <input value={h.value} onChange={e => updateKV(setHeaders, i, 'value', e.target.value)} placeholder="Value" className="flex-1 bg-gray-800 px-3 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none text-sm" />
                      <button onClick={() => removeKV(setHeaders, i)} className="p-2 hover:bg-gray-800 rounded text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button onClick={() => addKV(setHeaders)} className="text-sm text-gray-400 hover:text-purple-400 flex items-center gap-1"><Plus size={16} /> Add Header</button>
                </div>
              )}
              {activeTab === 'body' && (
                <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Request body (JSON)" className="w-full h-full min-h-[200px] bg-gray-800 px-4 py-3 rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-sm font-mono resize-none" />
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/30 px-4">
              <div className="flex">
                {['body', 'headers'].map(tab => (
                  <button key={tab} onClick={() => setResponseTab(tab)} className={`px-4 py-2.5 text-sm font-medium capitalize ${responseTab === tab ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}>{tab}</button>
                ))}
              </div>
              {response && (
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-bold ${getStatusColor(response.status)}`}>{response.status} {response.statusText}</span>
                  <span className="text-gray-500">{response.time}ms</span>
                  <span className="text-gray-500">{(response.size / 1024).toFixed(2)} KB</span>
                  <button onClick={copyRes} className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-900/20">
              {response ? (
                responseTab === 'body' ? (
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    {typeof response.body === 'object' ? <JsonHighlight data={response.body} /> : <pre className="text-sm whitespace-pre-wrap">{response.body}</pre>}
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-2">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="flex text-sm"><span className="text-purple-400 w-48 flex-shrink-0">{k}:</span><span className="text-gray-300">{v}</span></div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center"><Send size={48} className="mx-auto mb-4 opacity-20" /><p>Send a request to see the response</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showAuth && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowAuth(false)}>
          <div className="bg-gray-900 p-6 rounded-xl w-96 border border-gray-800" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{isLogin ? 'Login' : 'Sign Up'}</h2>
            <div className="space-y-4">
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" className="w-full bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-purple-500 outline-none" />
              <input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} placeholder="Password" className="w-full bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 focus:border-purple-500 outline-none" />
              <button onClick={handleAuth} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 rounded-lg font-medium">{isLogin ? 'Login' : 'Sign Up'}</button>
            </div>
            <p className="mt-4 text-center text-sm text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-purple-400 hover:underline">{isLogin ? 'Sign Up' : 'Login'}</button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}