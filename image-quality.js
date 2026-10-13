'use strict';
const imageScoreFmt=value=>numeric(value)?fmt(value):'';
const imageQualityHash=(model,category)=>'#image-quality/'+encodeURIComponent(model)+'/'+encodeURIComponent(category);
function imageQualityStats(rows){
  const scored=rows.filter(row=>numeric(row.score));
  const mean=key=>{const values=scored.map(row=>row[key]).filter(numeric);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;};
  return {quality:mean('score'),qualityN:scored.length,rule:mean('ruleScore'),judge:mean('judgeScore'),total:rows.length};
}
function imageQualityIntro(){
  const s=imageQualityStats(imageRows()),models=DATA.images.models.filter(model=>imageQualityStats(imageRows(model)).qualityN);
  return `<section class="quality-intro image-quality-intro" aria-label="图片质量评分覆盖情况"><div class="quality-intro-title"><p class="eyebrow">IMAGE ARTIFACT QUALITY</p><h2>图片产物质量评分 <span>满分 100</span></h2><p>规则分 35% + Judge 分 65%，最终分已应用源表封顶。空白表示尚无评分。</p></div><div class="quality-summary"><div><b>${models.length}<small> / ${DATA.images.models.length}</small></b><label>已有评分的图片模型</label></div><div><b>${s.qualityN}</b><label>已评分图片产物</label></div><div><b>${s.total-s.qualityN}</b><label>待评分图片产物</label></div><div><b>${imageScoreFmt(s.quality)}<small> / 100</small></b><label>图片产物均分</label></div></div></section>`;
}
function renderImageQualityDetail(model,category){
  renderImageDetail(model,category);
  if(!document.getElementById('image-case-list'))return;
  imageMetric='quality';
  const rows=imageRows(model,category),s=imageQualityStats(rows),label=model==='all'?'全部图片模型':model,catLabel=category==='all'?'全部图片分类':category;
  document.title=`${label} · ${catLabel} · 图片质量评分 | KUSE Benchmark`;
  const back=app.querySelector('.breadcrumb a');back.href='#image-scores';back.textContent='← 图片质量评分总览';
  app.querySelector('.detail-heading .eyebrow').textContent='IMAGE QUALITY SCORES & EVIDENCE';
  app.querySelector('.detail-heading h1').innerHTML=`${escapeHtml(catLabel)}<span> / 图片质量评分</span>`;
  app.querySelector('.detail-heading .subtitle').textContent=`${label} · ${category==='all'?20:10} 条完整 Prompt · 评分构成、最终产物与核对依据`;
  app.querySelector('.detail-kpis').innerHTML=`<div class="detail-kpi quality-kpi"><label>平均质量分</label><b>${imageScoreFmt(s.quality)}<small>/ 100</small></b><p>仅统计已有最终评分的记录</p></div><div class="detail-kpi"><label>评分覆盖</label><b>${s.qualityN}<small>/ ${s.total}</small></b><p>已评分记录 / 本组图片记录</p></div><div class="detail-kpi"><label>规则分均值</label><b>${imageScoreFmt(s.rule)}<small>/ 100</small></b><p>图片任务要求与规则完成度</p></div><div class="detail-kpi"><label>Judge 分均值</label><b>${imageScoreFmt(s.judge)}<small>/ 100</small></b><p>源表中的图片视觉质量评分</p></div>`;
  const oldExport=document.getElementById('image-export'),button=oldExport.cloneNode(true);oldExport.replaceWith(button);button.textContent='↓ 导出图片评分 CSV';button.addEventListener('click',()=>exportImageQualityCsv(model,category));
  const oldSearch=document.getElementById('image-prompt-search'),search=oldSearch.cloneNode(true);oldSearch.replaceWith(search);search.addEventListener('input',event=>{imageDetailQuery=event.target.value;renderImageCases(model,category);mountImageQualityCases(model,category);});
  const update=()=>{location.hash=imageQualityHash(document.getElementById('image-detail-model').value,document.getElementById('image-detail-category').value);};
  for(const id of ['image-detail-model','image-detail-category']){const old=document.getElementById(id),select=old.cloneNode(true);old.replaceWith(select);select.addEventListener('change',update);}
  mountImageQualityCases(model,category);
}
function mountImageQualityCases(model,category){
  const rows=imageRows(model,category);
  for(const card of document.querySelectorAll('.image-case')){
    const testId=card.id.slice(6),reviews=rows.filter(row=>row.testId===testId),scored=reviews.filter(row=>numeric(row.score));
    const table=`<div class="results-scroll image-score-records"><table class="results quality-results"><caption class="sr-only">${escapeHtml(testId)} 图片评分明细</caption><thead><tr><th scope="col">图片评测模型</th><th scope="col" class="numeric">最终评分 / 100</th><th scope="col" class="numeric">规则分</th><th scope="col" class="numeric">Judge 分</th><th scope="col" class="numeric">封顶分</th><th scope="col">评分状态</th></tr></thead><tbody>${reviews.map(row=>`<tr><td class="model-name">${escapeHtml(row.model)}</td><td class="numeric final-score">${imageScoreFmt(row.score)}</td><td class="numeric">${imageScoreFmt(row.ruleScore)}</td><td class="numeric">${imageScoreFmt(row.judgeScore)}</td><td class="numeric">${numeric(row.score)&&!numeric(row.cap)?'未设封顶':imageScoreFmt(row.cap)}</td><td><span class="status ${numeric(row.score)?'completed':'pending'}">${numeric(row.score)?'已评分':'暂无评分'}</span></td></tr>`).join('')}</tbody></table></div>`;
    const evidence=scored.map(row=>`<section class="score-review" aria-label="${escapeHtml(row.model)} 图片评分依据"><div class="score-review-top"><div><span class="score-review-label">${model==='all'?escapeHtml(row.model)+' · ':''}评分产物（最终版）</span><p class="artifact-name">${escapeHtml(row.artifact)}</p></div><div class="score-total"><b>${imageScoreFmt(row.score)}</b><span> / 100</span></div></div><div class="score-bar" aria-hidden="true"><span style="width:${row.score}%"></span></div><div class="score-calculation"><span>规则权重 <b>${imageScoreFmt(numeric(row.ruleWeight)?row.ruleWeight*100:null)}%</b></span><span>Judge 权重 <b>${imageScoreFmt(numeric(row.judgeWeight)?row.judgeWeight*100:null)}%</b></span><span>加权分（封顶前）<b>${imageScoreFmt(row.weightedScore)}</b></span><span>封顶分 <b>${numeric(row.cap)?imageScoreFmt(row.cap):'未设封顶'}</b></span></div><div class="score-evidence"><label>源表评分依据与扣分原因</label><p>${escapeHtml(row.evidence)}</p></div></section>`).join('');
    card.querySelector('.results-scroll').insertAdjacentHTML('beforebegin',table+evidence);
    if(!scored.length)card.querySelector('.image-score-records').insertAdjacentHTML('afterend','<div class="quality-pending">本组尚无图片质量评分，分数保留为空。</div>');
  }
}
function exportImageQualityCsv(model,category){
  const columns=['测试集 ID','图片模型','类别','完整 Prompt','最终评分（满分100）','规则分','Judge分','规则权重（%）','Judge权重（%）','封顶分','加权分（封顶前）','评分状态','评分产物（最终版）','源表评分依据','参考附件文件名'];
  const rows=imageRows(model,category).map(row=>{const test=DATA.images.tests.find(test=>test.id===row.testId);return [row.testId,row.model,row.category,test.prompt,rounded(row.score),rounded(row.ruleScore),rounded(row.judgeScore),numeric(row.ruleWeight)?rounded(row.ruleWeight*100):null,numeric(row.judgeWeight)?rounded(row.judgeWeight*100):null,rounded(row.cap),rounded(row.weightedScore),numeric(row.score)?'已评分':'暂无评分',row.artifact,row.evidence,test.attachments.join('\n')];});
  const csvValue=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  const blob=new Blob(['\uFEFF'+[columns,...rows].map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`KUSE_图片质量评分_${model==='all'?'全部图片模型':model}_${category==='all'?'全部分类':category}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('已导出完整图片 Prompt 与评分依据');
}
