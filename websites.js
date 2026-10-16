'use strict';
let websiteDetailQuery='';
const websiteRows=model=>DATA.websites.records.filter(row=>!model||row.model===model);
const websiteHash=model=>'#website-detail/'+encodeURIComponent(model);
function websiteStats(rows){
  const valid=rows.filter(row=>row.valid);
  const result={total:rows.length,valid:valid.length};
  for(const key of ['seconds','credits']){
    const values=valid.map(row=>row[key]).filter(numeric);
    result[key]=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  }
  return result;
}
function websiteOverview(){
  const data=DATA.websites,s=websiteStats(data.records);
  const cell=(model,key)=>{
    const value=websiteStats(websiteRows(model))[key],label=key==='seconds'?'平均耗时':'平均积分',unit=key==='seconds'?'秒':'积分';
    const values=data.models.map(m=>websiteStats(websiteRows(m))[key]).filter(numeric);
    const best=numeric(value)&&values.length>1&&Math.abs(value-Math.min(...values))<1e-8;
    return `<td><a class="cell ${best?'best':''}" href="${websiteHash(model)}" aria-label="${escapeHtml(model+' · '+label+' '+fmt(value)+' '+unit+'，查看10份样本数据')}">${numeric(value)?fmt(value):''}</a></td>`;
  };
  return `<section class="website-benchmark" id="website-benchmark" aria-labelledby="website-heading"><div class="image-heading"><div><p class="eyebrow">WEBSITE MODEL BENCHMARK</p><h2 id="website-heading">网站模型评测 <span>BENCH10</span></h2><p class="subtitle">同一组网站任务，比较三个模型的交付耗时与积分。点击均值，查看完整 Prompt 和 10 份样本数据。</p></div><div class="hero-stats"><div class="hero-stat"><b>${data.models.length}</b><small>网站模型</small></div><div class="hero-stat"><b>${data.tests.length}</b><small>固定场景</small></div><div class="hero-stat"><b>${s.valid}<span class="image-total"> / ${s.total}</span></b><small>有效 / 计划记录</small></div></div></div><div class="matrix-panel"><div class="matrix-scroller"><table class="matrix website-matrix"><caption class="sr-only">网站模型平均耗时和平均积分，每个模型10份样本</caption><thead><tr><th scope="col">网站评测模型<small>每个模型 10 份样本</small></th><th scope="col">平均耗时 <span class="metric-unit">s</span></th><th scope="col">平均积分</th></tr></thead><tbody>${data.models.map(model=>`<tr><th scope="row"><a class="model-button" href="${websiteHash(model)}"><span class="model-icon family-anthropic" aria-hidden="true">✳</span>${escapeHtml(model)}</a></th>${cell(model,'seconds')}${cell(model,'credits')}</tr>`).join('')}</tbody></table></div><div class="matrix-note"><span>耗时单位：秒 · 点击任一均值查看该模型的 10 份样本数据</span><span class="legend"><span><i></i>该列最低均值</span></span></div></div><div class="below-note"><span>${data.history.length} 条原始中断记录保留在明细中，不计入均值。网站质量尚未评分。</span><a href="#website-method">查看网站统计口径 ↗</a></div></section>`;
}
function websiteMethodology(){
  return `<section class="method-card" id="website-methodology"><h2>网站模型统计口径</h2><p>${escapeHtml(DATA.websites.methodology)}</p><p>未进行网站功能、安全或质量评分。交付网址按源表保留，本看板展示执行数据。</p><p>来源：${escapeHtml(DATA.websites.sourceName)} · 网站评测汇总 / 网站评测明细 / 网站测试集 · 数据更新 ${escapeHtml(DATA.websites.updated)}</p></section>`;
}
function renderWebsiteDetail(model){
  if(!DATA.websites.models.includes(model)){app.innerHTML='<div class="error-state">未找到该网站模型。<a href="#websites">返回网站模型</a></div>';return;}
  const rows=websiteRows(model),s=websiteStats(rows);
  document.title=`${model} · 10份网站样本 | KUSE Benchmark`;
  app.innerHTML=`<div class="breadcrumb"><a href="#websites">← 网站模型总览</a><span>/</span><span>${escapeHtml(model)}</span></div><section class="detail-heading"><div><p class="eyebrow">WEBSITE PROMPTS & RESULTS</p><h1>网站模型评测<span> / ${escapeHtml(model)}</span></h1><p class="subtitle">10 份样本数据 · 完整 Prompt、交付耗时、积分与网站地址</p></div><button class="button" id="website-export">↓ 导出网站 CSV</button></section><div class="detail-controls"><select id="website-detail-model" aria-label="选择网站模型">${DATA.websites.models.map(m=>`<option value="${escapeHtml(m)}" ${m===model?'selected':''}>${escapeHtml(m)}</option>`).join('')}</select><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input type="search" id="website-detail-search" aria-label="搜索网站样本" placeholder="搜索场景或 Prompt…" value="${escapeHtml(websiteDetailQuery)}"></label></div><div class="detail-kpis"><div class="detail-kpi"><label>平均耗时</label><b>${fmt(s.seconds)}<small>秒</small></b><p>10 份有效样本</p></div><div class="detail-kpi"><label>平均积分</label><b>${fmt(s.credits)}<small>积分</small></b><p>实际会话扣费</p></div></div><div class="detail-body"><aside class="case-nav" id="website-case-nav" aria-label="网站场景目录"></aside><div id="website-case-list"></div></div>${websiteMethodology()}`;
  renderWebsiteCases(model);
  document.getElementById('website-detail-model').addEventListener('change',event=>{location.hash=websiteHash(event.target.value);});
  document.getElementById('website-detail-search').addEventListener('input',event=>{websiteDetailQuery=event.target.value;renderWebsiteCases(model);});
  document.getElementById('website-export').addEventListener('click',()=>exportWebsiteCsv(model));
}
function renderWebsiteCases(model){
  const query=websiteDetailQuery.trim().toLowerCase();
  const tests=DATA.websites.tests.filter(test=>(test.id+' '+test.title+' '+test.prompt).toLowerCase().includes(query));
  document.getElementById('website-case-nav').innerHTML=`<label>本组 10 份样本</label>${tests.map(test=>`<a href="#website-${test.id}" data-website-case="${test.id}"><span class="num">${test.id.slice(-2)}</span><span>${escapeHtml(test.title)}</span></a>`).join('')}<div class="count-label">显示 ${tests.length} / 10 份</div>`;
  document.getElementById('website-case-list').innerHTML=tests.map(test=>{
    const row=websiteRows(model).find(r=>r.testId===test.id),history=DATA.websites.history.filter(r=>r.model===model&&r.testId===test.id);
    return `<article class="case-card website-case" id="website-${test.id}"><div class="case-top"><span class="case-index">${test.id.slice(-2)}</span><div><h2 class="case-title">${escapeHtml(test.title)}</h2><div class="case-id">${test.id}</div></div><button class="button" data-website-copy="${test.id}">复制 Prompt</button></div><div class="prompt-area"><p class="prompt-label">FULL PROMPT</p><p class="prompt-text">${escapeHtml(test.prompt)}</p>${test.attachments.length?`<div class="attachments"><details><summary>查看参考附件文件名</summary><ul>${test.attachments.map(name=>`<li>${escapeHtml(name)}</li>`).join('')}</ul></details></div>`:''}</div><div class="results-scroll"><table class="results website-results"><caption class="sr-only">${test.id} 网站执行数据</caption><thead><tr><th scope="col">模型</th><th scope="col" class="numeric">耗时 / 秒</th><th scope="col" class="numeric">积分</th><th scope="col">状态</th><th scope="col">交付网址</th></tr></thead><tbody><tr><td class="model-name">${escapeHtml(model)}</td><td class="numeric">${numeric(row.seconds)?fmt(row.seconds):''}</td><td class="numeric">${numeric(row.credits)?fmt(row.credits):''}</td><td><span class="status ${row.valid?'completed':'pending'}">${escapeHtml(row.status)}</span></td><td>${row.sites.length?`<a class="website-result-link" href="${escapeHtml(row.sites[0])}" target="_blank" rel="noopener noreferrer">查看网站 ↗</a>`:''}</td></tr></tbody></table></div>${row.sites.length>1?`<details class="website-links"><summary>源表中的其他交付版本</summary>${row.sites.slice(1).map((url,i)=>`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">交付版本 ${i+2} ↗</a>`).join('')}</details>`:''}${row.exception?`<div class="record-note"><p>${escapeHtml(row.exception)}</p></div>`:''}${history.length?`<details class="website-history"><summary>原始中断记录 · 不计入均值</summary>${history.map(r=>`<p><b>${escapeHtml(r.status)}</b> · ${escapeHtml(r.version)}</p><p>${escapeHtml(r.exception)}</p>`).join('')}</details>`:''}<div class="case-tail"><span>数据版本：${escapeHtml(row.version)}</span><span>积分来源：${escapeHtml(row.creditSource)}</span></div></article>`;
  }).join('')||'<div class="empty-state">没有匹配的网站样本，清空搜索可查看全部 10 份。</div>';
  for(const link of document.querySelectorAll('[data-website-case]'))link.addEventListener('click',event=>{event.preventDefault();document.getElementById('website-'+link.dataset.websiteCase)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  for(const button of document.querySelectorAll('[data-website-copy]'))button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(DATA.websites.tests.find(t=>t.id===button.dataset.websiteCopy).prompt);toast('完整 Prompt 已复制');}catch{toast('浏览器未允许复制，请选中 Prompt 文本复制');}});
}
function exportWebsiteCsv(model){
  const columns=['测试 ID','场景','模型','完整 Prompt','耗时（秒）','积分','状态','交付网址','参考附件文件名','数据版本','积分来源','原始中断记录（不计入均值）'];
  const rows=websiteRows(model).map(row=>{const test=DATA.websites.tests.find(t=>t.id===row.testId),history=DATA.websites.history.filter(r=>r.model===model&&r.testId===row.testId);return [test.id,test.title,model,test.prompt,rounded(row.seconds),rounded(row.credits),row.status,row.sites.join('\n'),test.attachments.join('\n'),row.version,row.creditSource,history.map(r=>r.status+'：'+r.exception).join('\n')];});
  const csvValue=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const blob=new Blob(['\uFEFF'+[columns,...rows].map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`KUSE_网站模型_${model}_10份样本.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出10份网站样本与完整 Prompt');
}
