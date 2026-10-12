'use strict';
let DATA;
let metric = 'seconds';
let modelQuery = '';
let sorting = 'source';
let detailQuery = '';
const app = document.getElementById('app');
const categoryShort = ['网页生成','Markdown','PDF 生成','PPT 生成','知识召回','搜索研究','Word 生成','Excel 生成'];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric = value => typeof value === 'number' && Number.isFinite(value);
const rounded = value => numeric(value) ? Math.round(value) : null;
const fmt = value => numeric(value) ? rounded(value).toLocaleString('zh-CN',{maximumFractionDigits:0}) : '—';
const rawFmt = fmt;
const metricName = () => metric==='quality'?'平均质量分':metric==='seconds'?'平均耗时':'平均积分';
const unit = () => metric==='quality'?'分（满分100）':metric === 'seconds' ? '秒' : '积分';
const activeModels = () => {
  const models=DATA.models.filter(m=>m!==DATA.alias.model);
  const haiku=models.indexOf('Claude Haiku 5.5');
  if(haiku>=0&&models.includes('Claude Sonnet 5')){
    models.splice(haiku,1);
    models.splice(models.indexOf('Claude Sonnet 5')+1,0,'Claude Haiku 5.5');
  }
  return models;
};
const rowsFor = (model, category) => DATA.records.filter(r => (!model || model === 'all' || r.model === model) && (!category || r.category === category) && r.model !== DATA.alias.model);
function stats(rows){
  const complete = rows.filter(r=>r.status==='已完成');
  const s = complete.filter(r=>numeric(r.seconds));
  const c = complete.filter(r=>numeric(r.credits));
  const mean = (rows,key) => rows.length ? rows.reduce((a,r)=>a+r[key],0)/rows.length : null;
  return {...qualityStats(rows),seconds:mean(s,'seconds'),credits:mean(c,'credits'),secondsN:s.length,creditsN:c.length,completed:complete.length,total:rows.length,passed:rows.filter(r=>r.verdict==='通过').length};
}
function detailHash(model,category){return metric==='quality'?qualityHash(model,category):'#detail/'+encodeURIComponent(model)+'/'+encodeURIComponent(category);}
function family(model){return model==='Auto'?'auto':model.startsWith('Claude')?'anthropic':'openai';}
function icon(model){return model==='Auto'?'k':model.startsWith('Claude')?'✳':'◎';}
function methodology(){
  const rows=rowsFor();
  const count=status=>rows.filter(r=>r.status===status).length;
  return `<section class="method-card" id="methodology"><h2>每一个均值，都能查看原始记录</h2><div class="method-grid"><div><div class="method-label">统计口径</div><p>${escapeHtml(DATA.methodology)}</p><p>模型均值按该模型所有有效记录计算；分类均值按所有实际模型在该分类的有效记录计算。直接计算记录的算术平均，不对分组均值再次平均。先按原始数值计算均值，再四舍五入显示整数。明细和导出的耗时、积分同样显示整数。</p></div><div><div class="method-label">数据范围</div><p>80 条固定 Prompt，分为 8 个任务分类，每个分类 10 条。源表包含第 1 轮与 Staging 附件修复重测记录，快照日期为 2026 年 10 月 10 日。</p><p>Gemini 3.8 Flash 实际调用 GPT-5.6 Terra，未单独执行，因此不作为独立模型计算。源表中的失败、待重跑、已剔除和缺失数值，在明细中保留原始状态。</p></div></div><div class="method-points"><span><b>${count('已完成')}</b>已完成记录</span><span><b>${count('待重跑')}</b>待重跑</span><span><b>${count('失败')}</b>失败</span><span><b>${count('已剔除')}</b>已剔除</span></div><p style="margin-top:17px;font-size:10px;color:#a4acb8">数据来源：${escapeHtml(DATA.sourceName)}</p></section>`;
}
function renderOverview(){
  document.title='KUSE 模型评测看板';
  const global = stats(rowsFor());
  app.innerHTML = `<section class="hero"><div><p class="eyebrow">KUSE MODEL BENCHMARK</p><h1>模型评测<span> / ${metric==='quality'?'质量评分':'总览'}</span></h1><p class="subtitle">${metric==='quality'?'从任务要求到最终产物，查看质量评分、评分构成与核对依据。':'不同模型，同一组任务。对比耗时与积分，点击均值查看完整 Prompt 和执行记录。'}</p></div><div class="hero-stats"><div class="hero-stat"><b>${activeModels().length}</b><small>实际评测模型</small></div><div class="hero-stat"><b>${DATA.categories.length}</b><small>任务分类</small></div><div class="hero-stat"><b>${DATA.tests.length}</b><small>固定 Prompt</small></div><div class="hero-stat"><b>${global.completed}<span style="color:#bbc2cb;font-size:15px;font-weight:400"> / ${global.total}</span></b><small>已完成记录 / 计划记录</small></div></div></section><section aria-label="模型与分类均值"><div class="toolbar"><div class="toolbar-left"><span class="section-title">模型 × 分类${metric==='quality'?'质量均分':'均值'}</span><div class="metric-switch"><span class="metric-switch-label">切换指标</span><div class="segmented" aria-label="展示指标"><button type="button" data-metric="seconds" aria-pressed="${metric==='seconds'}" class="${metric==='seconds'?'active':''}">平均耗时 <span class="metric-unit">s</span></button><button type="button" data-metric="credits" aria-pressed="${metric==='credits'}" class="${metric==='credits'?'active':''}">平均积分</button><button type="button" data-metric="quality" aria-pressed="${metric==='quality'}" class="${metric==='quality'?'active':''}">质量评分</button></div></div></div><div class="toolbar-right"><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input id="model-search" type="search" placeholder="搜索模型…" aria-label="搜索模型" value="${escapeHtml(modelQuery)}"></label><select id="sort-select" aria-label="排序方式"><option value="source" ${sorting==='source'?'selected':''}>默认顺序</option><option value="asc" ${sorting==='asc'?'selected':''}>均值从低到高</option><option value="desc" ${sorting==='desc'?'selected':''}>均值从高到低</option></select></div></div>${metric==='quality'?qualityIntro():''}<p class="mobile-hint">左右滑动查看全部分类 →</p><div class="matrix-panel"><div class="matrix-scroller" id="matrix-mount"></div><div class="matrix-note"><span>单位：${unit()} · 点击任意均值，查看对应的 10 组 Prompt 与数据</span><span class="legend"><span>${metric==='quality'?'满分 100 · 分数越高越好':'<i></i>该列最低均值'}</span><span>${metric==='quality'?'— = 暂无评分 · n = 已评分记录数':'<sup>n</sup> = 有效记录数（少于 10 时标注）'}</span></span></div></div><div class="below-note"><span>Gemini 3.8 Flash → GPT-5.6 Terra，未单独执行</span><a href="#method">${metric==='quality'?'质量均分仅统计已有评分的记录':'均值仅统计已完成且有数值的记录'} · 查看口径 ↗</a></div></section>${metric==='quality'?qualityMethodology():methodology()}`;
  renderMatrix();
  app.querySelectorAll('[data-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.metric;const hash=metric==='quality'?'#scores':'#';if(location.hash===hash)renderOverview();else location.hash=hash;}));
  document.getElementById('model-search').addEventListener('input',e=>{modelQuery=e.target.value;renderMatrix();});
  document.getElementById('sort-select').addEventListener('change',e=>{sorting=e.target.value;renderMatrix();});
}
function renderMatrix(){
  let models=activeModels().filter(m=>m.toLowerCase().includes(modelQuery.trim().toLowerCase()));
  if(sorting!=='source') models.sort((a,b)=>{const x=stats(rowsFor(a))[metric],y=stats(rowsFor(b))[metric];if(!numeric(x))return numeric(y)?1:0;if(!numeric(y))return -1;return (sorting==='asc'?1:-1)*(x-y);});
  const chooseBest=values=>metric==='quality'?(values.length>1?Math.max(...values):null):Math.min(...values);
  const best=DATA.categories.map(cat=>chooseBest(activeModels().map(m=>stats(rowsFor(m,cat))[metric]).filter(numeric)));
  const modelBest=chooseBest(activeModels().map(m=>stats(rowsFor(m))[metric]).filter(numeric));
  function cell(model,cat,winner,overall=false){
    const s=stats(rowsFor(model,cat)), value=s[metric], n=s[metric+'N'];
    const isBest=numeric(winner)&&numeric(value)&&Math.abs(value-winner)<1e-9;
    const shade=numeric(value)?metric==='quality'?'#edf6f0':`rgba(231,235,241,${Math.min(.68,.1+value/(metric==='seconds'?1200:12000)*.55)})`:'#fafbfc';
    const desc=`${model||'所有实际模型'} · ${cat||'全部分类'}：${metricName()} ${fmt(value)} ${unit()}，${n} 条有效记录`;
    const nLabel=metric==='quality'?(numeric(value)?`<span class="incomplete">${overall?`${n}/${s.total}`:`n=${n}`}</span>`:''):!overall&&n<10?`<span class="incomplete">n=${n}</span>`:'';
    return `<td><button class="cell ${isBest?'best':''} ${numeric(value)?'':'missing'}" style="--shade:${shade}" data-detail="${escapeHtml(detailHash(model||'all',cat||(metric==='quality'?'all':DATA.categories[0])))}" title="${escapeHtml(desc)}" aria-label="${escapeHtml(desc+'，查看明细')}">${fmt(value)}${nLabel}</button></td>`;
  }
  const mount=document.getElementById('matrix-mount');
  mount.innerHTML=`<table class="matrix ${metric==='quality'?'quality-matrix':''}"><caption style="position:absolute;width:1px;height:1px;overflow:hidden">各模型与各分类的${metricName()}，${metric==='quality'?'仅统计已有最终评分的记录':'仅统计已完成的有效数值'}</caption><thead><tr><th scope="col">评测模型<small>${models.length} 个模型</small></th>${DATA.categories.map((c,i)=>`<th scope="col"><a href="${detailHash('all',c)}" title="查看${escapeHtml(c)}全部模型的 10 组记录">${categoryShort[i]} ↗</a><small>10 组测试</small></th>`).join('')}<th scope="col">模型均值<small>全部有效记录</small></th></tr></thead><tbody>${models.map(m=>`<tr class="${metric==='quality'&&qualityStats(rowsFor(m)).qualityN?'scored-model':''}"><th scope="row" style="padding:0;background:white;height:42px;border-bottom:1px solid #f0f2f5"><a class="model-button" href="${detailHash(m,DATA.categories[0])}"><span class="model-icon family-${family(m)}" aria-hidden="true">${icon(m)}</span>${escapeHtml(m)}</a></th>${DATA.categories.map((c,i)=>cell(m,c,best[i])).join('')}${cell(m,null,modelBest,true)}</tr>`).join('')}</tbody><tfoot><tr><td>分类均值 <span style="font-size:9px;color:#a7afbb;font-weight:400">${metric==='quality'?'已有评分':'全部模型'}</span></td>${DATA.categories.map(c=>cell(null,c,-1,true)).join('')}<td><span title="全部实际模型的有效记录均值">${fmt(stats(rowsFor())[metric])}</span></td></tr></tfoot></table>${models.length?'':'<div class="empty-state">没有匹配的模型，请尝试其他关键词。</div>'}`;
  mount.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.detail;}));
}
function statusClass(status){return status==='已完成'?'completed':status==='失败'?'failed':status==='待重跑'?'pending':'';}
function renderDetail(model,category){
  if(metric==='quality')metric='seconds';
  if((model!=='all'&&!activeModels().includes(model))||!DATA.categories.includes(category)){app.innerHTML='<div class="error-state">未找到对应数据。<a href="#">返回总览</a></div>';return;}
  const rows=rowsFor(model,category), s=stats(rows);
  const label=model==='all'?'全部实际模型':model;
  document.title=`${label} · ${category} | KUSE Benchmark`;
  const options=(values,selected)=>values.map(v=>`<option value="${escapeHtml(v)}" ${v===selected?'selected':''}>${escapeHtml(v)}</option>`).join('');
  app.innerHTML=`<div class="breadcrumb"><a href="#">← 评测总览</a><span>/</span><span>${escapeHtml(category)}</span><span>/</span><span>${escapeHtml(label)}</span></div><section class="detail-heading"><div><p class="eyebrow">PROMPTS & RESULTS</p><h1>${escapeHtml(category)}<span> / 明细</span></h1><p class="subtitle">${escapeHtml(label)} · 10 条固定 Prompt · 完整执行数据</p></div><button class="button" id="export-csv">↓ 导出本组 CSV</button></section><div class="detail-controls"><select id="detail-model" aria-label="选择模型"><option value="all" ${model==='all'?'selected':''}>全部实际模型</option>${options(activeModels(),model)}</select><select id="detail-category" aria-label="选择任务分类">${options(DATA.categories,category)}</select><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input id="prompt-search" type="search" placeholder="搜索 Prompt 或测试集 ID…" aria-label="搜索 Prompt 或测试集 ID" value="${escapeHtml(detailQuery)}"></label></div><div class="detail-kpis"><div class="detail-kpi"><label>平均耗时</label><b>${fmt(s.seconds)}<small>秒</small></b><p>${s.secondsN} 条已完成记录有耗时</p></div><div class="detail-kpi"><label>平均积分</label><b>${fmt(s.credits)}<small>积分</small></b><p>${s.creditsN} 条已完成记录有积分</p></div><div class="detail-kpi"><label>已完成记录</label><b>${s.completed}<small>/ ${s.total}</small></b><p>原始执行状态为“已完成”</p></div><div class="detail-kpi"><label>结果通过</label><b>${s.passed}<small>/ ${s.total}</small></b><p>原始结果判定为“通过”</p></div></div><div class="detail-body"><aside class="case-nav" aria-label="本组测试目录" id="case-nav"></aside><div id="case-list"></div></div><p class="subtitle" style="font-size:10px;margin-top:12px">${escapeHtml(DATA.methodology)}</p>`;
  renderCases(model,category);
  const update=()=>{detailQuery='';location.hash=detailHash(document.getElementById('detail-model').value,document.getElementById('detail-category').value);};
  document.getElementById('detail-model').addEventListener('change',update);
  document.getElementById('detail-category').addEventListener('change',update);
  document.getElementById('prompt-search').addEventListener('input',e=>{detailQuery=e.target.value;renderCases(model,category);});
  document.getElementById('export-csv').addEventListener('click',()=>exportCsv(model,category));
}
function renderCases(model,category){
  const modelOrder=activeModels();
  const tests=DATA.tests.filter(t=>t.category===category);
  const query=detailQuery.trim().toLowerCase();
  const filtered=tests.filter(t=>(t.id+' '+t.prompt+' '+t.intent).toLowerCase().includes(query));
  const rows=rowsFor(model,category);
  document.getElementById('case-nav').innerHTML=`<label>本组 10 条 PROMPT</label>${filtered.map(t=>`<a href="#case-${t.id}" data-case="case-${t.id}"><span class="num">${String(tests.indexOf(t)+1).padStart(2,'0')}</span><span>${escapeHtml(t.intent && t.intent.length<=24 ? t.intent : t.id)}</span></a>`).join('')}<div class="count-label">显示 ${filtered.length} / 10 组</div>`;
  document.querySelectorAll('[data-case]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.getElementById(a.dataset.case)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  document.getElementById('case-list').innerHTML=filtered.map(t=>{
    const caseRows=rows.filter(r=>r.testId===t.id).sort((a,b)=>modelOrder.indexOf(a.model)-modelOrder.indexOf(b.model));
    const noteRows=caseRows.filter(r=>r.note);
    return `<article class="case-card" id="case-${escapeHtml(t.id)}"><div class="case-top"><span class="case-index">${String(tests.indexOf(t)+1).padStart(2,'0')}</span><div><h2 class="case-title">${escapeHtml(t.intent && t.intent.length<=48 ? t.intent : '测试 '+String(tests.indexOf(t)+1).padStart(2,'0'))}</h2><div class="case-id">${escapeHtml(t.id)}</div></div><button class="button" data-copy="${escapeHtml(t.id)}" aria-label="复制 ${escapeHtml(t.id)} 的完整 Prompt">复制 Prompt</button></div><div class="prompt-area"><p class="prompt-label">FULL PROMPT</p><p class="prompt-text">${escapeHtml(t.prompt)}</p>${t.intent && t.intent.length>48 ? '<p class="intent-text">评测意图：'+escapeHtml(t.intent)+'</p>' : ''}<div class="case-meta"><span>${escapeHtml(t.category)}</span><span>来源：${escapeHtml(t.source)}</span><span>附件：${t.attachmentCount??0} 个</span></div>${t.attachments.filter(Boolean).length?`<div class="attachments"><details><summary>查看附件文件名</summary><ul>${t.attachments.filter(Boolean).map(a=>`<li>${escapeHtml(a.split('/').pop())}</li>`).join('')}</ul></details></div>`:''}</div><div class="results-scroll"><table class="results"><caption style="position:absolute;width:1px;height:1px;overflow:hidden">${escapeHtml(t.id)} 执行记录</caption><thead><tr><th scope="col">评测模型</th><th scope="col" class="numeric">耗时 / 秒</th><th scope="col" class="numeric">积分消耗</th><th scope="col">执行状态</th><th scope="col">结果判定</th><th scope="col">执行日期</th></tr></thead><tbody>${caseRows.map(r=>`<tr><td class="model-name">${escapeHtml(r.model)}</td><td class="numeric">${rawFmt(r.seconds)}</td><td class="numeric">${rawFmt(r.credits)}</td><td><span class="status ${statusClass(r.status)}">${escapeHtml(r.status)}</span></td><td class="${r.verdict==='通过'?'verdict-pass':r.verdict==='不通过'?'verdict-fail':''}">${escapeHtml(r.verdict||'—')}</td><td style="color:#929dab">${escapeHtml(r.date||'—')}</td></tr>`).join('')}</tbody></table></div>${noteRows.length?`<div class="record-note">${noteRows.map(r=>`<div><b>${model==='all'?escapeHtml(r.model)+' · ':''}原始备注：</b>${escapeHtml(r.note)}</div>`).join('')}</div>`:''}<div class="case-tail"><span>轮次：${[...new Set(caseRows.map(r=>r.round))].map(escapeHtml).join(' / ')}</span><span>记录来源：${[...new Set(caseRows.map(r=>r.source))].map(escapeHtml).join(' / ')}</span>${model==='all'?`<span>${caseRows.length} 条模型记录</span>`:''}</div></article>`;
  }).join('')||'<div class="empty-state">没有匹配的 Prompt，清空搜索可查看完整 10 组数据。</div>';
  document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{
    const prompt=DATA.tests.find(t=>t.id===b.dataset.copy).prompt;
    try{await navigator.clipboard.writeText(prompt);toast('完整 Prompt 已复制');}catch{toast('浏览器未允许复制，请选中 Prompt 文本复制');}
  }));
}
function exportCsv(model,category){
  const rows=rowsFor(model,category);
  const columns=['测试集 ID','模型','类别','完整 Prompt','评测意图','附件数','轮次','记录来源','执行日期','状态','耗时（秒）','积分消耗','结果判定','问题与备注'];
  const csvValue=value=>{
    let text=String(value??'');
    if(/^[=+@\-\t\r]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  };
  const lines=[columns,...rows.map(r=>{const t=DATA.tests.find(t=>t.id===r.testId);return [r.testId,r.model,r.category,t.prompt,t.intent,r.attachmentCount,r.round,r.source,r.date,r.status,rounded(r.seconds),rounded(r.credits),r.verdict,r.note];})];
  const blob=new Blob(['\uFEFF'+lines.map(l=>l.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`KUSE_${model==='all'?'全部模型':model}_${category}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出完整 Prompt 与执行记录');
}
let toastTimer;
function toast(message){const element=document.getElementById('toast');clearTimeout(toastTimer);element.textContent=message;element.hidden=false;toastTimer=setTimeout(()=>{element.hidden=true;},2500);}
function route(){
  const hash=location.hash;
  document.getElementById('overview-link').classList.toggle('active',hash!=='#method');
  document.getElementById('method-link').classList.toggle('active',hash==='#method');
  if(hash.startsWith('#quality/')){
    const parts=hash.slice(9).split('/');
    try{renderQualityDetail(decodeURIComponent(parts[0]||''),decodeURIComponent(parts[1]||''));}catch{app.innerHTML='<div class="error-state">链接格式无效。<a href="#scores">返回质量评分</a></div>';}
  }else if(hash.startsWith('#detail/')){
    const parts=hash.slice(8).split('/');
    try{renderDetail(decodeURIComponent(parts[0]||''),decodeURIComponent(parts[1]||''));}catch{app.innerHTML='<div class="error-state">链接格式无效。<a href="#">返回总览</a></div>';}
  }else if(hash==='#method'){
    document.title='统计口径 | KUSE Benchmark';
    const global=stats(rowsFor());
    app.innerHTML=`<div class="method-view"><div class="breadcrumb"><a href="#">← 评测总览</a></div><p class="eyebrow">DATA & METHODOLOGY</p><h1>数据与统计口径</h1>${methodology()}${qualityMethodology()}<p class="subtitle" style="margin-top:20px">${global.completed-global.secondsN} 条已完成记录缺少耗时；耗时均值基于 ${global.secondsN} 条记录，积分均值基于 ${global.creditsN} 条记录。0 积分按有效数值保留。</p></div>`;
  }else {if(hash==='#scores')metric='quality';else if(metric==='quality')metric='seconds';renderOverview();}
  window.scrollTo(0,0);
}
Promise.all([fetch('data.json?revision=11a9d20a22ea',{cache:'no-cache'}),fetch('quality.json?revision=38e91c80077c',{cache:'no-cache'})].map(p=>p.then(r=>{if(!r.ok)throw new Error('无法读取数据');return r.json();}))).then(([data,quality])=>{DATA={...data,quality};route();window.addEventListener('hashchange',()=>{detailQuery='';route();});}).catch(()=>{app.innerHTML='<div class="error-state">数据加载失败，请刷新页面重试。</div>';});
