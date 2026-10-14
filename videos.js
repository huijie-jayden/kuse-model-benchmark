'use strict';
let videoMetric='seconds';
let videoConfig='all';
let videoQuery='';
let videoDetailQuery='';
const videoRows=(model,mode,config)=>DATA.videos.records.filter(row=>(!model||model==='all'||row.model===model)&&(!mode||mode==='all'||row.mode===mode)&&(!config||config==='all'||row.config===config));
const videoHash=(model,mode,config)=>'#video-detail/'+[model,mode,config].map(encodeURIComponent).join('/');
const videoFmt=value=>numeric(value)?fmt(value):'';
const videoMetricName=()=>({seconds:'平均耗时',credits:'平均积分'})[videoMetric];
const videoUnit=()=>({seconds:'秒',credits:'积分'})[videoMetric];
const videoConfigLabel=config=>{const item=DATA.videos.configurations.find(item=>item.id===config);return config==='all'?'全部参数组合':item?`${item.resolution} · ${item.duration} 秒`:config;};
const videoModeLabel=mode=>mode==='all'?'全部视频类别':mode;
function videoDetailVariants(model,mode,config){
  const rows=videoRows(model,mode,config);
  return DATA.videos.variants.filter(item=>(mode==='all'||item.mode===mode)&&(config==='all'||item.config===config)&&((mode!=='all'&&config!=='all')||rows.some(row=>row.variantKey===item.key))).sort((a,b)=>DATA.videos.modes.indexOf(a.mode)-DATA.videos.modes.indexOf(b.mode)||DATA.videos.configurations.findIndex(c=>c.id===a.config)-DATA.videos.configurations.findIndex(c=>c.id===b.config)||a.testId.localeCompare(b.testId));
}
function videoStats(rows){
  const valid=rows.filter(row=>row.valid);
  const s={total:rows.length,valid:valid.length,completed:rows.filter(row=>['完成','已完成'].includes(row.status)).length};
  for(const key of ['seconds','credits']){
    const values=valid.map(row=>row[key]).filter(numeric);
    s[key]=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;s[key+'N']=values.length;
  }
  return s;
}
function videoOverview(){
  const s=videoStats(videoRows());
  return `<section class="video-benchmark" id="video-benchmark" aria-labelledby="video-heading"><div class="image-heading"><div><p class="eyebrow">VIDEO MODEL BENCHMARK</p><h2 id="video-heading">视频模型评测 <span>参数矩阵</span></h2><p class="subtitle">文生视频与图生视频作为两类评测列并排展示，每个分辨率与片长组合对应 10 个场景。</p></div><div class="hero-stats"><div class="hero-stat"><b>${DATA.videos.models.length}</b><small>视频模型</small></div><div class="hero-stat"><b>${DATA.videos.modes.length}</b><small>评测类别</small></div><div class="hero-stat"><b>${DATA.videos.groups.length}</b><small>参数组合</small></div><div class="hero-stat"><b>${s.valid}<span class="image-total"> / ${s.total}</span></b><small>有效 / 计划记录</small></div></div></div><div class="toolbar"><div class="toolbar-left"><span class="section-title" id="video-table-title"></span><div class="metric-switch"><span class="metric-switch-label">切换指标</span><div class="segmented" aria-label="视频模型展示指标">${['seconds','credits'].map(key=>`<button type="button" data-video-metric="${key}" class="${videoMetric===key?'active':''}" aria-pressed="${videoMetric===key}">${({seconds:'平均耗时',credits:'平均积分'})[key]}${key==='seconds'?'<span class="metric-unit">s</span>':''}</button>`).join('')}</div></div></div><div class="toolbar-right"><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input type="search" id="video-search" aria-label="搜索视频模型" placeholder="搜索视频模型…" value="${escapeHtml(videoQuery)}"></label><select id="video-config" aria-label="视频参数组合"><option value="all" ${videoConfig==='all'?'selected':''}>全部参数组合</option>${DATA.videos.configurations.map(config=>`<option value="${config.id}" ${videoConfig===config.id?'selected':''}>${escapeHtml(videoConfigLabel(config.id))}</option>`).join('')}</select></div></div><p class="mobile-hint">左右滑动查看全部参数组合 →</p><div class="matrix-panel"><div class="matrix-scroller" id="video-matrix-mount"></div><div class="matrix-note"><span id="video-unit-note"></span><span class="legend"><span><i></i>该组合最低均值</span></span></div></div><div class="video-data-note"><span>分辨率与片长为任务设置值，实际产物参数、质量评分尚未录入。</span><span>/ = 此组合无需评测；缺失指标仍留空，不计为 0。</span></div><div class="below-note"><span>视频记录 · ${escapeHtml(DATA.videos.snapshot)} · 每个参数组合独立统计</span><a href="#method">查看统计口径 ↗</a></div></section>`;
}
function mountVideoOverview(){
  renderVideoMatrix();
  for(const button of document.querySelectorAll('[data-video-metric]'))button.addEventListener('click',()=>{
    videoMetric=button.dataset.videoMetric;
    for(const other of document.querySelectorAll('[data-video-metric]')){const active=other.dataset.videoMetric===videoMetric;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));}
    renderVideoMatrix();
  });
  document.getElementById('video-search').addEventListener('input',event=>{videoQuery=event.target.value;renderVideoMatrix();});
  document.getElementById('video-config').addEventListener('change',event=>{videoConfig=event.target.value;renderVideoMatrix();});
}
function renderVideoMatrix(){
  const models=DATA.videos.models.filter(model=>model.toLowerCase().includes(videoQuery.trim().toLowerCase()));
  const configs=DATA.videos.configurations.filter(config=>videoConfig==='all'||config.id===videoConfig);
  const cell=(model,mode,config)=>{
    const boundary=mode===DATA.videos.modes[1]&&config.id===configs[0].id?'video-category-start':'';
    const rows=videoRows(model,mode,config.id),s=videoStats(rows),value=s[videoMetric],n=s[videoMetric+'N'];
    if(!rows.length)return `<td class="video-unavailable ${boundary}" aria-label="${escapeHtml(model+' · '+mode+' · '+videoConfigLabel(config.id))}：无需评测" title="此参数组合无需评测">/</td>`;
    const values=DATA.videos.models.map(item=>videoStats(videoRows(item,mode,config.id))[videoMetric]).filter(numeric);
    const isBest=model!=='all'&&numeric(value)&&values.length>1&&Math.abs(value-Math.min(...values))<1e-8;
    const label=`${model==='all'?'全部视频模型':model} · ${mode} · ${videoConfigLabel(config.id)}：${videoMetricName()} ${videoFmt(value)} ${videoUnit()}，${n} 条有效记录，查看完整 Prompt 与明细`;
    return `<td class="${boundary}"><a class="cell video-cell ${isBest?'best':''} ${numeric(value)?'':'missing'}" href="${videoHash(model,mode,config.id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="--shade:rgba(231,235,241,${numeric(value)?Math.min(.6,.1+value/(videoMetric==='seconds'?1200:15000)*.5):0})">${videoFmt(value)}</a></td>`;
  };
  document.getElementById('video-table-title').textContent='视频模型 × 评测类别与参数';
  const groupedCells=model=>DATA.videos.modes.map(mode=>configs.map(config=>cell(model,mode,config)).join('')).join('');
  const modelMean=model=>{
    const s=videoStats(videoRows(model,'all',videoConfig)),value=s[videoMetric],n=s[videoMetric+'N'];
    if(!s.total)return `<td class="video-model-mean video-unavailable" title="当前参数无需评测" aria-label="${escapeHtml(model)}：当前参数无需评测">/</td>`;
    const label=`${model==='all'?'全部视频模型':model} · 模型均值：${videoMetricName()} ${videoFmt(value)} ${videoUnit()}，${n} 条有效记录，查看明细`;
    return `<td class="video-model-mean"><a class="cell video-cell ${numeric(value)?'':'missing'}" href="${videoHash(model,'all',videoConfig)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${videoFmt(value)}</a></td>`;
  };
  document.getElementById('video-matrix-mount').innerHTML=`<table class="matrix video-matrix ${configs.length===1?'video-single-config':''}"><colgroup><col class="video-model-column">${DATA.videos.modes.map(()=>configs.map(()=>'<col class="video-parameter-column">').join('')).join('')}<col class="video-mean-column"></colgroup><caption class="sr-only">文生视频与图生视频在同一表格中按类别、分辨率与片长展示${videoMetricName()}</caption><thead><tr><th scope="col" rowspan="2">视频评测模型<small>${models.length} 个模型 · 每组合 10 场景</small></th>${DATA.videos.modes.map((mode,index)=>`<th scope="colgroup" colspan="${configs.length}" class="video-category video-category-${index}"><strong>${escapeHtml(videoModeLabel(mode))}</strong><span>每个组合 10 个场景</span></th>`).join('')}<th scope="col" rowspan="2" class="video-model-mean">模型均值<small>${videoConfig==='all'?'全部有效记录':'当前参数记录'}</small></th></tr><tr>${DATA.videos.modes.map(mode=>configs.map(config=>`<th scope="col" class="${mode===DATA.videos.modes[1]&&config.id===configs[0].id?'video-category-start':''}"><a href="${videoHash('all',mode,config.id)}" aria-label="${escapeHtml(mode+' · '+videoConfigLabel(config.id))} 全部模型明细">${escapeHtml(config.resolution)} ↗</a><small>设置片长 ${config.duration} 秒</small></th>`).join('')).join('')}</tr></thead><tbody>${models.map(model=>`<tr><th scope="row"><span class="video-model"><span class="model-icon family-video" aria-hidden="true">▷</span>${escapeHtml(model)}</span></th>${groupedCells(model)}${modelMean(model)}</tr>`).join('')}</tbody><tfoot><tr><td>参数组合均值<small>该组合全部视频模型</small></td>${groupedCells('all')}${modelMean('all')}</tr></tfoot></table>${models.length?'':'<div class="empty-state">没有匹配的视频模型，请尝试其他关键词。</div>'}`;
  document.getElementById('video-unit-note').textContent=`单位：${videoUnit()} · 参数均值查看 10 个场景，模型均值查看对应全部有效记录`;
}
function videoMethodology(){
  return `<section class="method-card"><h2>视频模型统计口径</h2><p>${escapeHtml(DATA.videos.methodology)} 最右侧模型均值对该模型当前参数范围内的有效记录直接求算术平均，覆盖文生视频和图生视频；无需评测的组合与缺失值不计入。</p><p>${escapeHtml(DATA.videos.artifactNote)} ${escapeHtml(DATA.videos.promptSource)}</p><p>来源：${escapeHtml(DATA.videos.sourceName)} · 视频分组汇总 / 视频记录 · 记录日期 ${escapeHtml(DATA.videos.snapshot)}</p></section>`;
}
function renderVideoDetail(model,mode,config){
  if((model!=='all'&&!DATA.videos.models.includes(model))||(mode!=='all'&&!DATA.videos.modes.includes(mode))||(config!=='all'&&!DATA.videos.configurations.some(item=>item.id===config))){
    app.innerHTML='<div class="error-state">未找到对应视频参数组合。<a href="#videos">返回视频模型</a></div>';return;
  }
  const rows=videoRows(model,mode,config),s=videoStats(rows),label=model==='all'?'全部视频模型':model,variantCount=videoDetailVariants(model,mode,config).length;
  document.title=`${label} · ${videoModeLabel(mode)} · ${videoConfigLabel(config)} | KUSE 视频评测`;
  const options=(values,selected)=>values.map(value=>`<option value="${escapeHtml(value)}" ${value===selected?'selected':''}>${escapeHtml(value)}</option>`).join('');
  app.innerHTML=`<div class="breadcrumb"><a href="#videos">← 视频模型总览</a><span>/</span><span>${escapeHtml(videoModeLabel(mode))}</span><span>/</span><span>${escapeHtml(videoConfigLabel(config))}</span></div><section class="detail-heading"><div><p class="eyebrow">VIDEO PROMPTS & PARAMETERS</p><h1>${escapeHtml(videoModeLabel(mode))}<span> / ${escapeHtml(videoConfigLabel(config))}</span></h1><p class="subtitle">${escapeHtml(label)} · ${variantCount} 个完整场景 Prompt · 参数组合独立执行记录</p></div><button class="button" id="video-export">↓ 导出视频 CSV</button></section><div class="detail-controls video-detail-controls"><select id="video-detail-model" aria-label="选择视频模型"><option value="all" ${model==='all'?'selected':''}>全部视频模型</option>${options(DATA.videos.models,model)}</select><select id="video-detail-mode" aria-label="选择视频输入模式"><option value="all" ${mode==='all'?'selected':''}>全部视频类别</option>${options(DATA.videos.modes,mode)}</select><select id="video-detail-config" aria-label="选择视频参数组合"><option value="all" ${config==='all'?'selected':''}>全部参数组合</option>${DATA.videos.configurations.map(item=>`<option value="${item.id}" ${config===item.id?'selected':''}>${escapeHtml(videoConfigLabel(item.id))}</option>`).join('')}</select><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input type="search" id="video-detail-search" aria-label="搜索视频 Prompt" placeholder="搜索场景或 Prompt…" value="${escapeHtml(videoDetailQuery)}"></label></div><div class="detail-kpis"><div class="detail-kpi"><label>平均耗时</label><b>${videoFmt(s.seconds)}<small>秒</small></b><p>${s.secondsN} 条有效计时记录</p></div><div class="detail-kpi"><label>平均积分</label><b>${videoFmt(s.credits)}<small>积分</small></b><p>${s.creditsN} 条有效积分记录</p></div><div class="detail-kpi"><label>有效记录</label><b>${s.valid}<small>/ ${s.total}</small></b><p>交付、计时和积分完整</p></div></div><div class="quality-detail-note">分辨率与片长为任务设置值，实际产物参数和质量评分按源表留空。${rows.length?'':'该模型未提供此参数组合数据。'}</div><div class="detail-body"><aside class="case-nav video-case-nav" id="video-case-nav" aria-label="视频场景目录"></aside><div id="video-case-list"></div></div>${videoMethodology()}`;
  renderVideoCases(model,mode,config);
  const update=()=>{location.hash=videoHash(document.getElementById('video-detail-model').value,document.getElementById('video-detail-mode').value,document.getElementById('video-detail-config').value);};
  for(const id of ['video-detail-model','video-detail-mode','video-detail-config'])document.getElementById(id).addEventListener('change',update);
  document.getElementById('video-detail-search').addEventListener('input',event=>{videoDetailQuery=event.target.value;renderVideoCases(model,mode,config);});
  document.getElementById('video-export').addEventListener('click',()=>exportVideoCsv(model,mode,config));
}
function renderVideoCases(model,mode,config){
  const variants=videoDetailVariants(model,mode,config);
  const rows=videoRows(model,mode,config),query=videoDetailQuery.trim().toLowerCase();
  const filtered=variants.filter(item=>(item.testId+' '+item.title+' '+item.prompt).toLowerCase().includes(query));
  document.getElementById('video-case-nav').innerHTML=`<label>本组 ${variants.length} 个场景</label>${filtered.map(item=>`<a href="#video-${escapeHtml(item.testId)}-${escapeHtml(item.config)}" data-video-case="video-${escapeHtml(item.testId)}-${escapeHtml(item.config)}"><span class="num">${String(variants.indexOf(item)+1).padStart(2,'0')}</span><span>${escapeHtml(item.title)}<small>${escapeHtml(item.mode+' · '+videoConfigLabel(item.config))}</small></span></a>`).join('')}<div class="count-label">显示 ${filtered.length} / ${variants.length} 组</div>`;
  document.getElementById('video-case-list').innerHTML=filtered.map(item=>{
    const cases=rows.filter(row=>row.variantKey===item.key).sort((a,b)=>DATA.videos.models.indexOf(a.model)-DATA.videos.models.indexOf(b.model));
    return `<article class="case-card video-case" id="video-${escapeHtml(item.testId)}-${escapeHtml(item.config)}"><div class="case-top"><span class="case-index">${String(variants.indexOf(item)+1).padStart(2,'0')}</span><div><h2 class="case-title">${escapeHtml(item.title)}</h2><div class="case-id">${escapeHtml(item.testId)}</div></div><button class="button" data-video-copy="${escapeHtml(item.key)}">复制 Prompt</button></div><div class="prompt-area"><p class="prompt-label">FULL PROMPT</p><p class="prompt-text">${escapeHtml(item.prompt)}</p><div class="case-meta"><span>${escapeHtml(item.mode)}</span><span>设置：${escapeHtml(item.aspectRatio)} · ${escapeHtml(videoConfigLabel(item.config))}</span><span>${cases.length} 条视频模型记录</span></div>${item.attachments.length?`<div class="attachments"><details><summary>查看参考附件文件名</summary><ul>${item.attachments.map(name=>`<li>${escapeHtml(name)}</li>`).join('')}</ul></details></div>`:''}</div><div class="results-scroll"><table class="results video-results"><caption class="sr-only">${escapeHtml(item.testId)} 视频执行记录</caption><thead><tr><th scope="col">视频模型</th><th scope="col" class="numeric">耗时 / 秒</th><th scope="col" class="numeric">积分</th><th scope="col">状态</th><th scope="col">结果判定</th><th scope="col">实际分辨率</th><th scope="col" class="numeric">实际片长 / 秒</th><th scope="col" class="numeric">质量评分</th></tr></thead><tbody>${cases.map(row=>`<tr><td class="model-name">${escapeHtml(row.model)}</td><td class="numeric">${videoFmt(row.seconds)}</td><td class="numeric">${videoFmt(row.credits)}</td><td><span class="status ${['完成','已完成'].includes(row.status)?'completed':statusClass(row.status)}">${escapeHtml(row.status)}</span></td><td class="${row.verdict==='通过'?'verdict-pass':''}">${escapeHtml(row.verdict)}</td><td>${escapeHtml(row.actualResolution)}</td><td class="numeric">${videoFmt(row.actualDuration)}</td><td class="numeric">${videoFmt(row.score)}</td></tr>`).join('')}</tbody></table></div>${cases.length?'':'<div class="quality-pending">该模型未提供此参数组合记录。</div>'}${cases.some(row=>row.exception)?`<div class="record-note">${cases.filter(row=>row.exception).map(row=>`<p><b>${escapeHtml(row.model)} 生成异常：</b>${escapeHtml(row.exception)}</p>`).join('')}</div>`:''}${cases.some(row=>row.reviewNote)?`<details class="video-review-note"><summary>查看源表历史采集与复核备注</summary><p>源表保留的历史备注，以当前记录状态、有效计时和积分为准。</p>${cases.filter(row=>row.reviewNote).map(row=>`<p><b>${escapeHtml(row.model)}：</b>${escapeHtml(row.reviewNote)}</p>`).join('')}</details>`:''}<div class="case-tail"><span>记录来源：视频记录</span><span>${[...new Set(cases.map(row=>(row.completedAt||'').slice(0,10)))].filter(Boolean).map(escapeHtml).join(' / ')}</span></div></article>`;
  }).join('')||'<div class="empty-state">没有匹配的视频 Prompt，清空搜索可查看全部记录。</div>';
  for(const link of document.querySelectorAll('[data-video-case]'))link.addEventListener('click',event=>{event.preventDefault();document.getElementById(link.dataset.videoCase)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
  for(const button of document.querySelectorAll('[data-video-copy]'))button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(DATA.videos.variants.find(item=>item.key===button.dataset.videoCopy).prompt);toast('完整视频 Prompt 已复制');}catch{toast('浏览器未允许复制，请选中 Prompt 文本复制');}});
}
function exportVideoCsv(model,mode,config){
  const columns=['场景 ID','视频模型','输入模式','场景','完整 Prompt','参考附件文件名','设置比例','设置分辨率','设置片长（秒）','状态','有效记录','耗时（秒）','积分','结果判定','实际分辨率','实际片长（秒）','质量评分','生成异常','历史采集与复核备注'];
  const rows=videoRows(model,mode,config).map(row=>{const item=DATA.videos.variants.find(item=>item.key===row.variantKey);return [row.testId,row.model,row.mode,row.title,item.prompt,item.attachments.join('\n'),row.aspectRatio,row.resolution,rounded(row.duration),row.status,row.valid?'是':'否',rounded(row.seconds),rounded(row.credits),row.verdict,row.actualResolution,rounded(row.actualDuration),rounded(row.score),row.exception,row.reviewNote];});
  const csvValue=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const blob=new Blob(['\uFEFF'+[columns,...rows].map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`KUSE_视频评测_${model==='all'?'全部视频模型':model}_${mode}_${config}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出完整视频 Prompt 与参数记录');
}
