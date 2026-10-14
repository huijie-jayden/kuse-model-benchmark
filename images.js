'use strict';
let imageMetric='seconds';
let imageModelQuery='';
let imageSorting='source';
let imageDetailQuery='';
const imageRows=(model,category)=>DATA.images.records.filter(r=>(!model||model==='all'||r.model===model)&&(!category||category==='all'||r.category===category));
const imageHash=(model,category)=>'#image-detail/'+encodeURIComponent(model)+'/'+encodeURIComponent(category);
const imageMetricLabel=()=>imageMetric==='quality'?'平均质量分':imageMetric==='seconds'?'平均耗时':'平均积分';
const imageUnit=()=>imageMetric==='quality'?'分（满分100）':imageMetric==='seconds'?'秒':'积分';
const imageDisplayStats=rows=>imageMetric==='quality'?imageQualityStats(rows):imageStats(rows);
const imageDisplayHash=(model,category)=>imageMetric==='quality'?imageQualityHash(model,category):imageHash(model,category);
const imageDisplayFmt=value=>imageMetric==='quality'?imageScoreFmt(value):fmt(value);
function imageStats(rows){
  const complete=rows.filter(r=>r.status==='已完成');
  const result={completed:complete.length,total:rows.length,passed:rows.filter(r=>r.verdict==='通过').length};
  for(const key of ['seconds','credits']){
    const values=complete.map(r=>r[key]).filter(numeric);
    result[key]=values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
    result[key+'N']=values.length;
  }
  return result;
}
function imageOverview(){
  const s=imageStats(imageRows());
  return `<section class="image-benchmark" id="image-benchmark" aria-labelledby="image-heading"><div class="image-heading"><div><p class="eyebrow">IMAGE MODEL BENCHMARK</p><h2 id="image-heading">图片模型评测 <span>BENCH20</span></h2><p class="subtitle">独立测试集 · 图片生成与参考图编辑各 10 条 Prompt，分别统计耗时、积分和产物质量评分。</p></div><div class="hero-stats"><div class="hero-stat"><b>${DATA.images.models.length}</b><small>图片模型</small></div><div class="hero-stat"><b>${DATA.images.categories.length}</b><small>任务分类</small></div><div class="hero-stat"><b>${DATA.images.tests.length}</b><small>固定 Prompt</small></div><div class="hero-stat"><b>${s.completed}<span class="image-total"> / ${s.total}</span></b><small>已完成 / 计划记录</small></div></div></div><div class="toolbar"><div class="toolbar-left"><span class="section-title">图片模型 × 分类均值</span><div class="metric-switch"><span class="metric-switch-label">切换指标</span><div class="segmented" aria-label="图片模型展示指标"><button type="button" data-image-metric="seconds" aria-pressed="${imageMetric==='seconds'}" class="${imageMetric==='seconds'?'active':''}">平均耗时 <span class="metric-unit">s</span></button><button type="button" data-image-metric="credits" aria-pressed="${imageMetric==='credits'}" class="${imageMetric==='credits'?'active':''}">平均积分</button><button type="button" data-image-metric="quality" aria-pressed="${imageMetric==='quality'}" class="${imageMetric==='quality'?'active':''}">质量评分</button></div></div></div><div class="toolbar-right"><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input id="image-model-search" type="search" placeholder="搜索图片模型…" aria-label="搜索图片模型" value="${escapeHtml(imageModelQuery)}"></label><select id="image-sort" aria-label="图片模型排序方式"><option value="source" ${imageSorting==='source'?'selected':''}>默认顺序</option><option value="asc" ${imageSorting==='asc'?'selected':''}>均值从低到高</option><option value="desc" ${imageSorting==='desc'?'selected':''}>均值从高到低</option></select></div></div><div id="image-quality-intro"></div><p class="mobile-hint">左右滑动查看全部分类 →</p><div class="matrix-panel"><div class="matrix-scroller" id="image-matrix-mount"></div><div class="matrix-note"><span id="image-unit-note"></span><span class="legend"><span><i></i>该列最低均值</span></span></div></div><div class="below-note"><span>图片 BENCH20 · ${escapeHtml(DATA.images.snapshot)} · 均值仅统计图片模型的有效记录</span><a href="#method">查看统计口径 ↗</a></div></section>`;
}
function mountImageOverview(){
  renderImageMatrix();
  document.querySelectorAll('[data-image-metric]').forEach(button=>button.addEventListener('click',()=>{
    imageMetric=button.dataset.imageMetric;
    document.querySelectorAll('[data-image-metric]').forEach(b=>{b.classList.toggle('active',b.dataset.imageMetric===imageMetric);b.setAttribute('aria-pressed',String(b.dataset.imageMetric===imageMetric));});
    renderImageMatrix();
  }));
  document.getElementById('image-model-search').addEventListener('input',event=>{imageModelQuery=event.target.value;renderImageMatrix();});
  document.getElementById('image-sort').addEventListener('change',event=>{imageSorting=event.target.value;renderImageMatrix();});
}
function renderImageMatrix(){
  const models=DATA.images.models.filter(model=>model.toLowerCase().includes(imageModelQuery.trim().toLowerCase()));
  if(imageSorting!=='source')models.sort((a,b)=>{
    const x=imageDisplayStats(imageRows(a))[imageMetric],y=imageDisplayStats(imageRows(b))[imageMetric];
    if(!numeric(x))return numeric(y)?1:0;if(!numeric(y))return -1;
    return (imageSorting==='asc'?1:-1)*(x-y);
  });
  const best=category=>{const values=DATA.images.models.map(model=>imageDisplayStats(imageRows(model,category))[imageMetric]).filter(numeric);return values.length?(imageMetric==='quality'?Math.max(...values):Math.min(...values)):null;};
  const cell=(model,category,winner)=>{
    const s=imageDisplayStats(imageRows(model,category)),value=s[imageMetric],n=s[imageMetric+'N'];
    const isBest=numeric(winner)&&numeric(value)&&Math.abs(value-winner)<1e-9;
    const description=`${model==='all'?'所有图片模型':model} · ${category==='all'?'全部图片分类':category}：${imageMetricLabel()} ${imageDisplayFmt(value)} ${imageUnit()}，${n} 条有效记录，查看明细`;
    const shade=imageMetric==='quality'&&numeric(value)?`rgba(89,155,119,${.06+value/100*.15})`:numeric(value)?`rgba(231,235,241,${Math.min(.68,.1+value/(imageMetric==='seconds'?300:700)*.55)})`:'#fafbfc';
    return `<td><button class="cell ${isBest?'best':''} ${numeric(value)?'':'missing'}" style="--shade:${shade}" data-image-detail="${escapeHtml(imageDisplayHash(model,category))}" aria-label="${escapeHtml(description)}" title="${escapeHtml(description)}">${imageDisplayFmt(value)}</button></td>`;
  };
  document.getElementById('image-quality-intro').innerHTML=imageMetric==='quality'?imageQualityIntro():'';
  document.querySelector('#image-benchmark .legend span:first-child').innerHTML=imageMetric==='quality'?'<i></i>该列最高均分':'<i></i>该列最低均值';
  document.getElementById('image-matrix-mount').innerHTML=`<table class="matrix image-matrix ${imageMetric==='quality'?'quality-matrix':''}"><caption class="sr-only">图片模型与两类图片任务的${imageMetricLabel()}，独立统计图片 BENCH20</caption><thead><tr><th scope="col">图片评测模型<small>${models.length} 个模型</small></th>${DATA.images.categories.map(category=>`<th scope="col"><a href="${imageDisplayHash('all',category)}">${escapeHtml(category)} ↗</a><small>10 组测试</small></th>`).join('')}<th scope="col">模型均值<small>全部 20 条测试</small></th></tr></thead><tbody>${models.map(model=>`<tr><th scope="row" class="image-model-cell"><a class="model-button" href="${imageDisplayHash(model,'all')}"><span class="model-icon ${model.startsWith('Nano')?'family-google':'family-openai'}" aria-hidden="true">${model.startsWith('Nano')?'✦':'◎'}</span>${escapeHtml(model)}</a></th>${DATA.images.categories.map(category=>cell(model,category,best(category))).join('')}${cell(model,'all',best('all'))}</tr>`).join('')}</tbody><tfoot><tr><td>分类均值 <span class="image-foot-label">全部图片模型</span></td>${DATA.images.categories.map(category=>cell('all',category,null)).join('')}<td>${imageDisplayFmt(imageDisplayStats(imageRows())[imageMetric])}</td></tr></tfoot></table>${models.length?'':'<div class="empty-state">没有匹配的图片模型，请尝试其他关键词。</div>'}`;
  document.getElementById('image-unit-note').textContent=`单位：${imageUnit()} · 点击分类均值查看 10 组 Prompt，模型均值查看全部 20 组`;
  document.querySelectorAll('[data-image-detail]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.imageDetail;}));
}
function imageMethodology(){
  return `<section class="method-card"><h2>图片模型统计口径</h2><p>独立图片 BENCH20：${DATA.images.models.length} 个模型、图片生成与参考图编辑两类任务，每类 10 条 Prompt，共 ${DATA.images.records.length} 条计划记录。图片模型与通用模型使用各自的测试集和记录，分别计算均值。</p><p>${escapeHtml(DATA.images.methodology)} 模型均值覆盖两类任务；分类均值使用所有图片模型的对应任务记录。详情与 CSV 保留完整 Prompt、附件文件名、执行状态和结果判定。</p><p>${escapeHtml(DATA.images.qualityMethodology)} 评分来自“填写记录”的产物评分、评分依据和最终产物三列，图片质量明细保留完整原始依据。</p><p>数据快照：${escapeHtml(DATA.images.snapshot)} · 来源：${escapeHtml(DATA.images.sourceName)}</p></section>`;
}
function renderImageDetail(model,category){
  if((model!=='all'&&!DATA.images.models.includes(model))||(category!=='all'&&!DATA.images.categories.includes(category))){app.innerHTML='<div class="error-state">未找到对应图片模型数据。<a href="#images">返回图片模型</a></div>';return;}
  const rows=imageRows(model,category),s=imageStats(rows),tests=DATA.images.tests.filter(test=>category==='all'||test.category===category);
  const label=model==='all'?'全部图片模型':model,catLabel=category==='all'?'全部图片分类':category;
  document.title=`${label} · ${catLabel} | KUSE 图片模型评测`;
  const options=(values,selected)=>values.map(value=>`<option value="${escapeHtml(value)}" ${value===selected?'selected':''}>${escapeHtml(value)}</option>`).join('');
  app.innerHTML=`<div class="breadcrumb"><a href="#images">← 图片模型总览</a><span>/</span><span>${escapeHtml(catLabel)}</span><span>/</span><span>${escapeHtml(label)}</span></div><section class="detail-heading"><div><p class="eyebrow">IMAGE PROMPTS & RESULTS</p><h1>${escapeHtml(catLabel)}<span> / 图片评测明细</span></h1><p class="subtitle">${escapeHtml(label)} · ${tests.length} 条完整 Prompt · 图片 BENCH20 执行记录</p></div><button class="button" id="image-export">↓ 导出本组 CSV</button></section><div class="detail-controls"><select id="image-detail-model" aria-label="选择图片模型"><option value="all" ${model==='all'?'selected':''}>全部图片模型</option>${options(DATA.images.models,model)}</select><select id="image-detail-category" aria-label="选择图片任务分类"><option value="all" ${category==='all'?'selected':''}>全部图片分类</option>${options(DATA.images.categories,category)}</select><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input id="image-prompt-search" type="search" placeholder="搜索 Prompt 或测试集 ID…" aria-label="搜索图片 Prompt" value="${escapeHtml(imageDetailQuery)}"></label></div><div class="detail-kpis"><div class="detail-kpi"><label>平均耗时</label><b>${fmt(s.seconds)}<small>秒</small></b><p>${s.secondsN} 条有效耗时记录</p></div><div class="detail-kpi"><label>平均积分</label><b>${fmt(s.credits)}<small>积分</small></b><p>${s.creditsN} 条有效积分记录</p></div><div class="detail-kpi"><label>已完成记录</label><b>${s.completed}<small>/ ${s.total}</small></b><p>本组已完成 / 计划记录</p></div><div class="detail-kpi"><label>结果通过</label><b>${s.passed}<small>/ ${s.total}</small></b><p>源表结果判定为“通过”</p></div></div><div class="detail-body"><aside class="case-nav" id="image-case-nav" aria-label="图片测试目录"></aside><div id="image-case-list"></div></div>${imageMethodology()}`;
  renderImageCases(model,category);
  const update=()=>{location.hash=imageHash(document.getElementById('image-detail-model').value,document.getElementById('image-detail-category').value);};
  document.getElementById('image-detail-model').addEventListener('change',update);
  document.getElementById('image-detail-category').addEventListener('change',update);
  document.getElementById('image-prompt-search').addEventListener('input',event=>{imageDetailQuery=event.target.value;renderImageCases(model,category);});
  document.getElementById('image-export').addEventListener('click',()=>exportImageCsv(model,category));
}
function renderImageCases(model,category){
  const tests=DATA.images.tests.filter(test=>category==='all'||test.category===category),rows=imageRows(model,category),query=imageDetailQuery.trim().toLowerCase();
  const filtered=tests.filter(test=>(test.id+' '+test.prompt+' '+test.intent).toLowerCase().includes(query));
  document.getElementById('image-case-nav').innerHTML=`<label>本组 ${tests.length} 条 PROMPT</label>${filtered.map(test=>`<a href="#image-${escapeHtml(test.id)}" data-image-case="image-${escapeHtml(test.id)}"><span class="num">${String(tests.indexOf(test)+1).padStart(2,'0')}</span><span>${escapeHtml(test.intent||test.id)}</span></a>`).join('')}<div class="count-label">显示 ${filtered.length} / ${tests.length} 组</div>`;
  document.getElementById('image-case-list').innerHTML=filtered.map(test=>{
    const caseRows=rows.filter(row=>row.testId===test.id).sort((a,b)=>DATA.images.models.indexOf(a.model)-DATA.images.models.indexOf(b.model));
    return `<article class="case-card image-case" id="image-${escapeHtml(test.id)}"><div class="case-top"><span class="case-index">${String(tests.indexOf(test)+1).padStart(2,'0')}</span><div><h2 class="case-title">${escapeHtml(test.intent||test.id)}</h2><div class="case-id">${escapeHtml(test.id)}</div></div><button class="button" data-image-copy="${escapeHtml(test.id)}" aria-label="复制 ${escapeHtml(test.id)} 的完整 Prompt">复制 Prompt</button></div><div class="prompt-area"><p class="prompt-label">FULL PROMPT</p><p class="prompt-text">${escapeHtml(test.prompt)}</p><div class="case-meta"><span>${escapeHtml(test.category)}</span><span>附件：${test.attachmentCount??0} 个</span><span>${caseRows.length} 条图片模型记录</span></div>${test.attachments.length?`<div class="attachments"><details><summary>查看参考附件文件名</summary><ul>${test.attachments.map(name=>`<li>${escapeHtml(name)}</li>`).join('')}</ul></details></div>`:''}</div><div class="results-scroll"><table class="results"><caption class="sr-only">${escapeHtml(test.id)} 图片模型执行记录</caption><thead><tr><th scope="col">图片评测模型</th><th scope="col" class="numeric">耗时 / 秒</th><th scope="col" class="numeric">积分消耗</th><th scope="col">执行状态</th><th scope="col">结果判定</th><th scope="col">执行日期</th></tr></thead><tbody>${caseRows.map(row=>`<tr><td class="model-name">${escapeHtml(row.model)}</td><td class="numeric">${fmt(row.seconds)}</td><td class="numeric">${fmt(row.credits)}</td><td><span class="status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td><td class="${row.verdict==='通过'?'verdict-pass':row.verdict==='不通过'?'verdict-fail':''}">${escapeHtml(row.verdict||'—')}</td><td>${escapeHtml(row.date||'—')}</td></tr>`).join('')}</tbody></table></div>${caseRows.some(row=>row.note)?`<div class="record-note">${caseRows.filter(row=>row.note).map(row=>`<div><b>${model==='all'?escapeHtml(row.model)+' · ':''}原始备注：</b>${escapeHtml(row.note)}</div>`).join('')}</div>`:''}<div class="case-tail"><span>轮次：${[...new Set(caseRows.map(row=>row.round))].map(escapeHtml).join(' / ')}</span><span>记录来源：${escapeHtml(test.source)}</span></div></article>`;
  }).join('')||'<div class="empty-state">没有匹配的图片 Prompt，清空搜索可查看全部记录。</div>';
  document.querySelectorAll('[data-image-case]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();document.getElementById(link.dataset.imageCase)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  document.querySelectorAll('[data-image-copy]').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(DATA.images.tests.find(test=>test.id===button.dataset.imageCopy).prompt);toast('完整图片 Prompt 已复制');}catch{toast('浏览器未允许复制，请选中 Prompt 文本复制');}}));
}
function exportImageCsv(model,category){
  const columns=['测试集 ID','图片模型','类别','完整 Prompt','评测意图','附件数','参考附件文件名','轮次','记录来源','执行日期','状态','耗时（秒）','积分消耗','结果判定','问题与备注'];
  const rows=imageRows(model,category).map(row=>{const test=DATA.images.tests.find(test=>test.id===row.testId);return [row.testId,row.model,row.category,test.prompt,test.intent,test.attachmentCount,test.attachments.join('\n'),row.round,row.source,row.date,row.status,rounded(row.seconds),rounded(row.credits),row.verdict,row.note];});
  const csvValue=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const blob=new Blob(['\uFEFF'+[columns,...rows].map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`KUSE_图片评测_${model==='all'?'全部图片模型':model}_${category==='all'?'全部分类':category}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出完整图片 Prompt 与执行记录');
}
