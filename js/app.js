function loadScriptChain(urls, done){
    if(!urls.length){ if(done) done(new Error('All sources failed to load.')); return; }
    var s = document.createElement('script');
    s.src = urls[0];
    s.onload = function(){ if(done) done(null); };
    s.onerror = function(){ loadScriptChain(urls.slice(1), done); };
    document.head.appendChild(s);
  }
  function loadFallbackJsPDF(){
    if(window.jspdf) return;
    loadScriptChain([
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
    ]);
  }
  function loadFallbackPdfJs(){
    if(window.pdfjsLib) return;
    loadScriptChain([
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.min.js'
    ], function(err){
      if(!err && window.pdfjsLib){
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
      }
    });
  }
  function loadFallbackJsZip(){
    if(window.JSZip) return;
    loadScriptChain([
      'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
      'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
    ]);
  }
  function loadFallbackPdfLib(){
    if(window.PDFLib) return;
    loadScriptChain([
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
    ]);
  }
  function loadFallbackHeic2Any(){
    if(window.heic2any) return;
    loadScriptChain([
      'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js'
    ]);
  }

window.addEventListener('DOMContentLoaded', function(){
    if(window.pdfjsLib){
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/legacy/build/pdf.worker.min.js';
    }
  });

(function(){
  /* ---------------- shared helpers ---------------- */
  function showErrorIn(el, msg, ms){
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(()=>{ el.style.display='none'; }, ms || 8000);
  }
  function readAsDataURL(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = ()=> reject(new Error('Could not read "' + file.name + '" from disk.'));
      reader.readAsDataURL(file);
    });
  }
  function readAsArrayBuffer(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = ()=> reject(new Error('Could not read "' + file.name + '" from disk.'));
      reader.readAsArrayBuffer(file);
    });
  }
  function readAsText(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = ()=> reject(new Error('Could not read "' + file.name + '" from disk.'));
      reader.readAsText(file);
    });
  }
  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
  }
  function waitForGlobal(getter, timeoutMs, label){
    return new Promise((resolve, reject)=>{
      const start = Date.now();
      (function poll(){
        const v = getter();
        if(v){ resolve(v); }
        else if(Date.now() - start > timeoutMs){ reject(new Error(label + ' failed to load')); }
        else{ setTimeout(poll, 150); }
      })();
    });
  }
  function loadImage(url, name){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error('Could not decode "' + name + '". It may be corrupted or an unsupported format.'));
      img.src = url;
    });
  }
  function formatMB(bytesLen){
    return (bytesLen / (1024*1024)).toFixed(2);
  }
    /* ---------------- Basketball Throw Dropzone FX ---------------- */
  function setupDropzoneBasketballFx(dropzone){
    const canvas = document.createElement('canvas');
    canvas.className = 'bb-overlay-canvas';
    dropzone.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let width = 0;
    let height = 0;
    function resizeCanvas(){
      const rect = dropzone.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      if(width > 0 && height > 0){
        canvas.width = width;
        canvas.height = height;
      }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Basketball state
    let isDragging = false;
    let dragCurrent = { x: 0, y: 0 };
    let dragHistory = [];
    let ball = {
      active: false,
      x: 0,
      y: 0,
      radius: 22,
      vx: 0,
      vy: 0,
      rotation: 0,
      img: null
    };
    let particles = [];
    let scoreFlash = 0;
    let animId = null;

    function getHoop(){
      return {
        x: width - 75,
        y: Math.max(50, Math.min(100, height * 0.45)),
        radius: 36
      };
    }

    function spawnParticles(x, y){
      const colors = ['#7C6FFF', '#4FD8C4', '#FFD93D', '#FF6B6B', '#FF8A50'];
      for(let i = 0; i < 24; i++){
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 5 + 2;
        particles.push({
          x: x, y: y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 2,
          life: 1,
          decay: Math.random() * 0.03 + 0.02,
          size: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    function render(){
      ctx.clearRect(0, 0, width, height);

      // Only draw hoop if dragging files over or ball is in flight or particles active
      const hoop = getHoop();
      if(isDragging || ball.active || particles.length > 0 || scoreFlash > 0){
        // Backboard
        ctx.fillStyle = 'rgba(124, 111, 255, 0.15)';
        ctx.fillRect(hoop.x + hoop.radius + 2, hoop.y - 45, 6, 65);
        ctx.strokeStyle = 'rgba(124, 111, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hoop.x + hoop.radius + 2, hoop.y - 45, 6, 65);

        // Hoop Rim
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(hoop.x, hoop.y, hoop.radius, 0, Math.PI);
        ctx.stroke();

        // Net
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        const netDepth = 32;
        for(let i = 0; i <= 6; i++){
          const t = i / 6;
          const topX = hoop.x - hoop.radius + t * hoop.radius * 2;
          const botX = hoop.x - hoop.radius * 0.45 + t * (hoop.radius * 0.9);
          ctx.beginPath();
          ctx.moveTo(topX, hoop.y);
          ctx.quadraticCurveTo((topX + botX)/2, hoop.y + netDepth * 0.55, botX, hoop.y + netDepth);
          ctx.stroke();
        }
        for(let j = 1; j <= 2; j++){
          const ny = hoop.y + j * (netDepth / 3);
          const shrink = j * 4;
          ctx.beginPath();
          ctx.moveTo(hoop.x - hoop.radius + shrink, ny);
          ctx.lineTo(hoop.x + hoop.radius - shrink, ny);
          ctx.stroke();
        }
      }

      // Aim Line & Trajectory while dragging
      if(isDragging && !ball.active){
        const dx = hoop.x - dragCurrent.x;
        const dy = hoop.y - dragCurrent.y;

        // Dashed trajectory aim line to hoop
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(dragCurrent.x, dragCurrent.y);
        ctx.lineTo(hoop.x, hoop.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated parabolic prediction dots
        const pvx = dx * 0.08;
        const pvy = dy * 0.08 - 2.5;
        const grav = 0.4;
        ctx.globalAlpha = 0.5;
        for(let step = 1; step <= 14; step++){
          const px = dragCurrent.x + pvx * step;
          const py = dragCurrent.y + pvy * step + 0.5 * grav * step * step;
          ctx.fillStyle = step % 2 === 0 ? '#7C6FFF' : '#4FD8C4';
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.5, 3.5 - step * 0.15), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw Basketball following the cursor
        drawBall(dragCurrent.x, dragCurrent.y, 0, ball.img);
      }

      // Ball in flight (thrown towards hoop)
      if(ball.active){
        ball.vy += 0.42; // Gravity
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.rotation += ball.vx * 0.04;

        // Floor bounce
        if(ball.y + ball.radius > height){
          ball.y = height - ball.radius;
          ball.vy *= -0.6;
          ball.vx *= 0.8;
          if(Math.abs(ball.vy) < 0.6) ball.vy = 0;
        }

        // Backboard bounce
        if(ball.x + ball.radius > hoop.x + hoop.radius && ball.x - ball.radius < hoop.x + hoop.radius + 15){
          if(ball.y > hoop.y - 45 && ball.y < hoop.y + 25){
            ball.x = hoop.x + hoop.radius - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.7;
          }
        }

        // Goal detection
        if(ball.vy > 0 &&
           Math.abs(ball.x - hoop.x) < hoop.radius * 0.85 &&
           Math.abs(ball.y - hoop.y) < 16){
          scoreFlash = 45;
          spawnParticles(hoop.x, hoop.y + 10);
          dropzone.classList.add('bb-scoring');
          setTimeout(()=> dropzone.classList.remove('bb-scoring'), 600);
          ball.active = false;
        }

        // Off-screen reset
        if(ball.x > width + 60 || ball.x < -60 || ball.y > height + 60){
          ball.active = false;
        }

        drawBall(ball.x, ball.y, ball.rotation, ball.img);
      }

      // Score celebration particles
      for(let i = particles.length - 1; i >= 0; i--){
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= p.decay;
        if(p.life <= 0){
          particles.splice(i, 1);
        } else {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // SCORE banner flash
      if(scoreFlash > 0){
        ctx.save();
        ctx.fillStyle = '#4FD8C4';
        ctx.font = '700 22px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#4FD8C4';
        ctx.shadowBlur = 12;
        ctx.fillText('SWISH! 🏀', hoop.x, hoop.y - 50);
        ctx.restore();
        scoreFlash--;
      }

      if(isDragging || ball.active || particles.length > 0 || scoreFlash > 0){
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        animId = null;
      }
    }

    function drawBall(x, y, rotation, customImg){
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.clip();

      if(customImg && customImg.complete && customImg.naturalWidth > 0){
        ctx.drawImage(customImg, -ball.radius, -ball.radius, ball.radius * 2, ball.radius * 2);
      } else {
        // Authentic Basketball
        const grad = ctx.createRadialGradient(-ball.radius * 0.3, -ball.radius * 0.3, 2, 0, 0, ball.radius);
        grad.addColorStop(0, '#FFA24C');
        grad.addColorStop(0.7, '#E65100');
        grad.addColorStop(1, '#BF360C');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#212121';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Ribs
        ctx.beginPath();
        ctx.moveTo(0, -ball.radius);
        ctx.lineTo(0, ball.radius);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-ball.radius, 0);
        ctx.lineTo(ball.radius, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(-ball.radius * 0.6, 0, ball.radius * 0.8, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ball.radius * 0.6, 0, ball.radius * 0.8, Math.PI - Math.PI / 3, Math.PI + Math.PI / 3);
        ctx.stroke();
      }
      ctx.restore();

      // Shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + ball.radius + 3, ball.radius * 0.75, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function startLoop(){
      if(!animId){
        animId = requestAnimationFrame(render);
      }
    }

    function setCustomBallImage(file){
      if(file && file.type && file.type.startsWith('image/')){
        const reader = new FileReader();
        reader.onload = function(evt){
          const img = new Image();
          img.onload = function(){
            ball.img = img;
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    }

    return {
      onDragEnter(e){
        resizeCanvas();
        isDragging = true;
        const rect = dropzone.getBoundingClientRect();
        dragCurrent.x = e.clientX - rect.left;
        dragCurrent.y = e.clientY - rect.top;
        dragHistory = [{ x: dragCurrent.x, y: dragCurrent.y, t: Date.now() }];

        if(e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items[0]){
          const item = e.dataTransfer.items[0];
          if(item.kind === 'file' && item.type.startsWith('image/')){
            // Custom ball preview if possible
          }
        }
        startLoop();
      },
      onDragOver(e){
        isDragging = true;
        const rect = dropzone.getBoundingClientRect();
        dragCurrent.x = e.clientX - rect.left;
        dragCurrent.y = e.clientY - rect.top;
        dragHistory.push({ x: dragCurrent.x, y: dragCurrent.y, t: Date.now() });
        if(dragHistory.length > 5) dragHistory.shift();
        startLoop();
      },
      onDragLeave(e){
        isDragging = false;
        startLoop();
      },
      onDrop(e, files){
        isDragging = false;
        const rect = dropzone.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;

        if(files && files[0] && files[0].type.startsWith('image/')){
          setCustomBallImage(files[0]);
        }

        // Calculate throw impulse towards hoop
        const hoop = getHoop();
        const dx = hoop.x - dropX;
        const dy = hoop.y - dropY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        ball.active = true;
        ball.x = dropX;
        ball.y = dropY;
        // Perfect velocity calculation to arch gracefully into the hoop
        ball.vx = Math.min(10, Math.max(3.5, dx * 0.04));
        ball.vy = Math.min(-3.5, -Math.sqrt(Math.abs(dy) * 0.45 + 16));
        ball.rotation = 0;

        startLoop();
      }
    };
  }

  function attachDropzone(dropzone, fileInput, browseBtn, onFiles){
    const bbFx = setupDropzoneBasketballFx(dropzone);

    dropzone.addEventListener('click', ()=> fileInput.click());
    browseBtn.addEventListener('click', (e)=>{ e.stopPropagation(); fileInput.click(); });
    fileInput.addEventListener('change', (e)=>{
      if(e.target.files && e.target.files.length){
        onFiles(e.target.files);
        // Also trigger ball throw if uploaded via browse button
        const hoop = { x: dropzone.clientWidth - 75, y: dropzone.clientHeight * 0.45 };
        bbFx.onDrop({ clientX: dropzone.getBoundingClientRect().left + 80, clientY: dropzone.getBoundingClientRect().bottom - 40 }, e.target.files);
      }
      fileInput.value = '';
    });

    ['dragenter','dragover'].forEach(evt=>{
      dropzone.addEventListener(evt, (e)=>{
        e.preventDefault();
        dropzone.classList.add('drag');
        if(evt === 'dragenter') bbFx.onDragEnter(e);
        else bbFx.onDragOver(e);
      });
    });

    ['dragleave'].forEach(evt=>{
      dropzone.addEventListener(evt, (e)=>{
        e.preventDefault();
        if(e.target !== dropzone) return;
        dropzone.classList.remove('drag');
        bbFx.onDragLeave(e);
      });
    });

    dropzone.addEventListener('drop', (e)=>{
      e.preventDefault();
      dropzone.classList.remove('drag');
      if(e.dataTransfer.files && e.dataTransfer.files.length){
        bbFx.onDrop(e, e.dataTransfer.files);
        onFiles(e.dataTransfer.files);
      }
    });
  }
const docIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h6l4 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/></svg>';

  /* ---------------- sidebar nav ---------------- */
  const nav = document.getElementById('nav');
  const navIndicator = document.getElementById('navIndicator');
  const navItems = Array.from(nav.querySelectorAll('.nav-item'));
  const panels = {
    img2pdf: document.getElementById('panel-img2pdf'),
    pdf2img: document.getElementById('panel-pdf2img'),
    imgconv: document.getElementById('panel-imgconv'),
    heic2img: document.getElementById('panel-heic2img'),
    svg2raster: document.getElementById('panel-svg2raster'),
    merge: document.getElementById('panel-merge'),
    split: document.getElementById('panel-split'),
    pdf2text: document.getElementById('panel-pdf2text'),
    text2pdf: document.getElementById('panel-text2pdf'),
    csvjson: document.getElementById('panel-csvjson'),
    
  };

  function moveIndicator(){
    const active = nav.querySelector('.nav-item.active');
    if(!active) return;
    const navRect = nav.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    navIndicator.style.width = r.width + 'px';
    navIndicator.style.height = r.height + 'px';
    navIndicator.style.transform = 'translate(' + (r.left - navRect.left) + 'px,' + (r.top - navRect.top) + 'px)';
  }

  navItems.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      navItems.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      Object.keys(panels).forEach(key=>{
        panels[key].classList.toggle('active', key === btn.dataset.tool);
      });
      moveIndicator();
    });
  });

  window.addEventListener('resize', ()=>{ moveIndicator(); });
  window.addEventListener('load', ()=>{ moveIndicator(); });
  requestAnimationFrame(()=> requestAnimationFrame(moveIndicator));

  /* segmented control helper */
  function wireSegmented(container, onChange){
    const btns = Array.from(container.querySelectorAll('button'));
    btns.forEach(b=>{
      b.addEventListener('click', ()=>{
        btns.forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        onChange(b.dataset.fmt);
      });
    });
  }

  /* generic reorderable grid drag wiring for a card element */
  function wireDrag(card, id, getDragId, setDragId, onReorder){
    card.draggable = true;
    card.addEventListener('dragstart', (e)=>{
      setDragId(id);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', ()=>{
      card.classList.remove('dragging');
    });
    card.addEventListener('dragover', (e)=>{ e.preventDefault(); card.classList.add('dragover'); });
    card.addEventListener('dragleave', ()=>{ card.classList.remove('dragover'); });
    card.addEventListener('drop', (e)=>{
      e.preventDefault();
      card.classList.remove('dragover');
      const srcId = getDragId();
      if(srcId && srcId !== id) onReorder(srcId, id);
    });
  }

  /* =================================================================== */
  /* ================= TOOL 1: JPG/PNG/WEBP -> PDF ==================== */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const sheetSection = document.getElementById('sheetSection');
    const framesEl = document.getElementById('frames');
    const countTag = document.getElementById('countTag');
    const statusText = document.getElementById('statusText');
    const convertBtn = document.getElementById('convertBtn');
    const clearBtn = document.getElementById('clearBtn');
    const resultEl = document.getElementById('result');
    const resultTitle = document.getElementById('resultTitle');
    const resultSub = document.getElementById('resultSub');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMsg = document.getElementById('errorMsg');
    const pageSizeSelect = document.getElementById('pageSizeSelect');

    let images = [];
    let dragSrcId = null;

    async function acceptFiles(fileList){
      const files = Array.from(fileList).filter(f => /image\/(jpe?g|png|webp)/i.test(f.type));
      if(files.length === 0 && fileList.length > 0){
        showErrorIn(errorMsg, 'Only JPG, PNG and WEBP files are supported here.');
        return;
      }
      for(const file of files){
        try{
          const url = await readAsDataURL(file);
          const id = 'f' + Date.now() + Math.random().toString(36).slice(2,8);
          images.push({id, file, url});
        }catch(err){
          showErrorIn(errorMsg, err.message);
        }
      }
      render();
    }

    function render(){
      sheetSection.style.display = images.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      images.forEach((img, idx)=>{
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.id = img.id;
        card.innerHTML = `
          <span class="drag-handle">⋮⋮</span>
          <img class="thumb" src="${img.url}" alt="${img.file.name}">
          <div class="meta">
            <span class="page-no">page ${idx+1}</span>
            <button class="icon-btn remove" aria-label="Remove image" data-id="${img.id}">✕</button>
          </div>
        `;
        wireDrag(card, img.id, ()=>dragSrcId, (id)=>{dragSrcId=id;}, reorder);
        framesEl.appendChild(card);
      });

      framesEl.querySelectorAll('.remove').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          images = images.filter(i=>i.id !== btn.dataset.id);
          resultEl.classList.remove('show');
          render();
        });
      });

      countTag.textContent = images.length + (images.length===1 ? ' page' : ' pages');
      statusText.innerHTML = '<strong>' + images.length + '</strong> image' + (images.length===1?'':'s') + ' ready';
      convertBtn.disabled = images.length === 0;
    }

    function reorder(srcId, targetId){
      const srcIdx = images.findIndex(i=>i.id===srcId);
      const targetIdx = images.findIndex(i=>i.id===targetId);
      if(srcIdx === -1 || targetIdx === -1) return;
      const [moved] = images.splice(srcIdx, 1);
      images.splice(targetIdx, 0, moved);
      resultEl.classList.remove('show');
      render();
    }

    attachDropzone(dropzone, fileInput, browseBtn, acceptFiles);

    clearBtn.addEventListener('click', ()=>{
      images = [];
      resultEl.classList.remove('show');
      render();
    });

    convertBtn.addEventListener('click', async ()=>{
      if(images.length === 0) return;
      convertBtn.disabled = true;
      const originalLabel = convertBtn.innerHTML;
      convertBtn.innerHTML = '<span class="spin"></span>Binding pages…';

      try{
        const jsPDF = (await waitForGlobal(()=> window.jspdf && window.jspdf.jsPDF, 8000, 'PDF engine')).valueOf ? window.jspdf.jsPDF : window.jspdf.jsPDF;
        const pageSizeMode = pageSizeSelect.value;
        const doc = new jsPDF({ unit: 'pt', format: pageSizeMode === 'fit' ? 'a4' : pageSizeMode });
        const skipped = [];
        let pagesAdded = 0;

        for(let i=0; i<images.length; i++){
          const entry = images[i];
          let imgEl;
          try{
            imgEl = await loadImage(entry.url, entry.file.name);
          }catch(loadErr){
            console.error(loadErr);
            skipped.push(entry.file.name);
            continue;
          }

          const canvas = document.createElement('canvas');
          canvas.width = imgEl.naturalWidth;
          canvas.height = imgEl.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgEl, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

          if(pageSizeMode === 'fit'){
            const w = imgEl.naturalWidth * 0.75; // px -> pt
            const h = imgEl.naturalHeight * 0.75;
            doc.addPage([w, h]);
            doc.addImage(dataUrl, 'JPEG', 0, 0, w, h);
          } else {
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 24;
            const maxW = pageW - margin*2;
            const maxH = pageH - margin*2;
            const ratio = Math.min(maxW / imgEl.naturalWidth, maxH / imgEl.naturalHeight);
            const w = imgEl.naturalWidth * ratio;
            const h = imgEl.naturalHeight * ratio;
            const x = (pageW - w) / 2;
            const y = (pageH - h) / 2;
            if(pagesAdded > 0) doc.addPage();
            doc.addImage(dataUrl, 'JPEG', x, y, w, h);
          }
          pagesAdded++;
        }

        if(pagesAdded === 0){
          throw new Error('None of the selected images could be converted. Try re-saving them as standard JPGs and upload again.');
        }

        if(pageSizeMode === 'fit'){
          // page 1 was jsPDF's default blank page; every image was placed on a page
          // added afterwards, so drop that unused leading page now that we have others.
          doc.deletePage(1);
        }

        const dataUri = doc.output('datauristring');
        const sizeMB = formatMB(dataUri.length * 0.75);
        resultTitle.textContent = 'converted.pdf';
        resultSub.textContent = pagesAdded + (pagesAdded===1?' page':' pages') + ' · ~' + sizeMB + ' MB';
        downloadBtn.href = dataUri;
        downloadBtn.setAttribute('download', 'converted.pdf');
        resultEl.classList.add('show');

        if(skipped.length){
          showErrorIn(errorMsg, 'Skipped ' + skipped.length + ' file(s) that could not be read: ' + skipped.join(', '));
        }
      }catch(err){
        if(err && /failed to load/.test(err.message)){
          showErrorIn(errorMsg, 'The PDF engine could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
        }else{
          showErrorIn(errorMsg, 'Something went wrong while building the PDF: ' + (err && err.message ? err.message : 'unknown error') + '. Please try again.');
        }
        console.error(err);
      }finally{
        convertBtn.disabled = images.length === 0;
        convertBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 2: PDF -> JPG/PNG ========================= */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzonePdf');
    const fileInput = document.getElementById('fileInputPdf');
    const browseBtn = document.getElementById('browseBtnPdf');
    const sheetSection = document.getElementById('sheetSectionPdf');
    const framesEl = document.getElementById('framesPdf');
    const countTag = document.getElementById('countTagPdf');
    const statusText = document.getElementById('statusTextPdf');
    const clearBtn = document.getElementById('clearBtnPdf');
    const zipBtn = document.getElementById('zipBtn');
    const errorMsg = document.getElementById('errorMsgPdf');
    const hintPdf = document.getElementById('hintPdf');
    const formatSeg = document.getElementById('pdf2imgFormat');

    let pages = [];
    let sourceName = 'document';
    let outFormat = 'jpeg';

    wireSegmented(formatSeg, (fmt)=>{ outFormat = fmt; });

    function render(){
      sheetSection.style.display = pages.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      pages.forEach((p, idx)=>{
        const card = document.createElement('div');
        card.className = 'file-card static';
        card.innerHTML = `
          <img class="thumb" src="${p.dataUrl}" alt="page ${idx+1}">
          <div class="meta">
            <span class="page-no">page ${idx+1}</span>
            <a class="icon-btn dl" href="${p.dataUrl}" download="${p.name}" aria-label="Download page ${idx+1}">↓</a>
          </div>
        `;
        framesEl.appendChild(card);
      });
      countTag.textContent = pages.length + (pages.length===1 ? ' page' : ' pages');
      statusText.innerHTML = '<strong>' + pages.length + '</strong> page' + (pages.length===1?'':'s') + ' ready';
      zipBtn.disabled = pages.length === 0;
    }

    async function handleFile(file){
      if(!file) return;
      if(file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)){
        showErrorIn(errorMsg, 'Please choose a PDF file.');
        return;
      }
      pages = [];
      sourceName = file.name.replace(/\.pdf$/i, '') || 'document';
      sheetSection.style.display = 'block';
      framesEl.innerHTML = '';
      hintPdf.textContent = 'Rendering pages…';
      zipBtn.disabled = true;
      statusText.innerHTML = '<strong>0</strong> pages ready';
      countTag.textContent = 'working…';

      const mime = outFormat === 'png' ? 'image/png' : 'image/jpeg';
      const ext = outFormat === 'png' ? 'png' : 'jpg';

      try{
        const pdfjsLib = await waitForGlobal(()=> window.pdfjsLib, 8000, 'PDF reader');
        if(!pdfjsLib.GlobalWorkerOptions.workerSrc){
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/legacy/build/pdf.worker.min.js';
        }
        const dataUrl = await readAsDataURL(file);
        const loadingTask = pdfjsLib.getDocument({ url: dataUrl });
        const pdf = await loadingTask.promise;
        const total = pdf.numPages;

        for(let i=1; i<=total; i++){
          hintPdf.textContent = 'Rendering page ' + i + ' of ' + total + '…';
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if(outFormat === 'jpeg'){
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const outUrl = canvas.toDataURL(mime, 0.92);
          const pad = String(i).padStart(String(total).length, '0');
          pages.push({ name: sourceName + '-page-' + pad + '.' + ext, dataUrl: outUrl });
          render();
        }
        hintPdf.textContent = 'Each page rendered as a ' + ext.toUpperCase() + ' — download individually or all together.';
      }catch(err){
        console.error(err);
        if(err && /failed to load/.test(err.message)){
          showErrorIn(errorMsg, 'The PDF reader could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
        }else{
          showErrorIn(errorMsg, 'Could not read that PDF: ' + (err && err.message ? err.message : 'unknown error') + '. It may be corrupted or password-protected.');
        }
        sheetSection.style.display = pages.length ? 'block' : 'none';
      }
    }

    attachDropzone(dropzone, fileInput, browseBtn, (files)=> handleFile(files[0]));

    clearBtn.addEventListener('click', ()=>{
      pages = [];
      render();
    });

    zipBtn.addEventListener('click', async ()=>{
      if(pages.length === 0) return;
      zipBtn.disabled = true;
      const originalLabel = zipBtn.innerHTML;
      zipBtn.innerHTML = '<span class="spin"></span>Zipping…';
      try{
        const JSZip = await waitForGlobal(()=> window.JSZip, 8000, 'Zip engine');
        const zip = new JSZip();
        pages.forEach(p=>{
          const base64 = p.dataUrl.split(',')[1];
          zip.file(p.name, base64, { base64: true });
        });
        const content = await zip.generateAsync({ type: 'base64' });
        const a = document.createElement('a');
        a.href = 'data:application/zip;base64,' + content;
        a.download = sourceName + '-pages.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }catch(err){
        console.error(err);
        showErrorIn(errorMsg, 'Could not build the ZIP: ' + (err && err.message ? err.message : 'unknown error') + '. You can still download pages one by one.');
      }finally{
        zipBtn.disabled = pages.length === 0;
        zipBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 3: IMAGE FORMAT CONVERTER ================= */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneConv');
    const fileInput = document.getElementById('fileInputConv');
    const browseBtn = document.getElementById('browseBtnConv');
    const sheetSection = document.getElementById('sheetSectionConv');
    const framesEl = document.getElementById('framesConv');
    const countTag = document.getElementById('countTagConv');
    const statusText = document.getElementById('statusTextConv');
    const convertBtn = document.getElementById('convertConvBtn');
    const clearBtn = document.getElementById('clearBtnConv');
    const errorMsg = document.getElementById('errorMsgConv');
    const formatSeg = document.getElementById('convFormat');
    const resultEl = document.getElementById('resultConv');
    const resultTitle = document.getElementById('resultTitleConv');
    const resultSub = document.getElementById('resultSubConv');
    const downloadZipBtn = document.getElementById('downloadZipConvBtn');

    let items = []; // {id, file, url, outUrl, outName}
    let target = 'jpeg';

    wireSegmented(formatSeg, (fmt)=>{
      target = fmt;
      items.forEach(it=>{ it.outUrl = null; });
      resultEl.classList.remove('show');
      render();
    });

    async function acceptFiles(fileList){
      const files = Array.from(fileList).filter(f => /^image\//i.test(f.type));
      if(files.length === 0 && fileList.length > 0){
        showErrorIn(errorMsg, 'Only image files are supported here.');
        return;
      }
      for(const file of files){
        try{
          const url = await readAsDataURL(file);
          const id = 'c' + Date.now() + Math.random().toString(36).slice(2,8);
          items.push({id, file, url, outUrl:null, outName:null});
        }catch(err){
          showErrorIn(errorMsg, err.message);
        }
      }
      resultEl.classList.remove('show');
      render();
    }

    function render(){
      sheetSection.style.display = items.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      items.forEach(it=>{
        const card = document.createElement('div');
        card.className = 'file-card static';
        const dlHref = it.outUrl || '#';
        const dlAttr = it.outUrl ? `href="${it.outUrl}" download="${it.outName}"` : `href="javascript:void(0)"`;
        card.innerHTML = `
          <img class="thumb" src="${it.url}" alt="${it.file.name}">
          <div class="meta">
            <span class="fname" title="${it.file.name}">${it.file.name}</span>
            <button class="icon-btn remove" aria-label="Remove image" data-id="${it.id}">✕</button>
          </div>
        `;
        if(it.outUrl){
          const dl = document.createElement('a');
          dl.className = 'icon-btn dl';
          dl.href = it.outUrl;
          dl.setAttribute('download', it.outName);
          dl.setAttribute('aria-label', 'Download converted file');
          dl.textContent = '↓';
          dl.style.position = 'absolute';
          dl.style.top = '8px';
          dl.style.right = '8px';
          card.appendChild(dl);
        }
        framesEl.appendChild(card);
      });
      framesEl.querySelectorAll('.remove').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          items = items.filter(i=>i.id !== btn.dataset.id);
          resultEl.classList.remove('show');
          render();
        });
      });
      countTag.textContent = items.length + (items.length===1 ? ' file' : ' files');
      statusText.innerHTML = '<strong>' + items.length + '</strong> image' + (items.length===1?'':'s') + ' ready';
      convertBtn.disabled = items.length === 0;
    }

    attachDropzone(dropzone, fileInput, browseBtn, acceptFiles);

    clearBtn.addEventListener('click', ()=>{
      items = [];
      resultEl.classList.remove('show');
      render();
    });

    function extFor(fmt){ return fmt === 'jpeg' ? 'jpg' : fmt; }
    function mimeFor(fmt){ return 'image/' + fmt; }

    convertBtn.addEventListener('click', async ()=>{
      if(items.length === 0) return;
      convertBtn.disabled = true;
      const originalLabel = convertBtn.innerHTML;
      convertBtn.innerHTML = '<span class="spin"></span>Converting…';
      const mime = mimeFor(target);
      const ext = extFor(target);
      const skipped = [];
      let done = 0;

      try{
        for(const it of items){
          try{
            const imgEl = await loadImage(it.url, it.file.name);
            const canvas = document.createElement('canvas');
            canvas.width = imgEl.naturalWidth;
            canvas.height = imgEl.naturalHeight;
            const ctx = canvas.getContext('2d');
            if(target === 'jpeg'){
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(imgEl, 0, 0);
            const outUrl = canvas.toDataURL(mime, 0.92);
            const baseName = it.file.name.replace(/\.[^.]+$/, '');
            it.outUrl = outUrl;
            it.outName = baseName + '.' + ext;
            done++;
          }catch(err){
            console.error(err);
            skipped.push(it.file.name);
          }
        }

        render();

        if(done > 0){
          resultTitle.textContent = 'Converted to ' + ext.toUpperCase();
          resultSub.textContent = done + (done===1?' file':' files') + ' ready to download';
          resultEl.classList.add('show');
        }
        if(skipped.length){
          showErrorIn(errorMsg, 'Skipped ' + skipped.length + ' file(s) that could not be read: ' + skipped.join(', '));
        }
      }finally{
        convertBtn.disabled = items.length === 0;
        convertBtn.innerHTML = originalLabel;
      }
    });

    downloadZipBtn.addEventListener('click', async ()=>{
      const ready = items.filter(i=>i.outUrl);
      if(ready.length === 0) return;
      downloadZipBtn.disabled = true;
      const originalLabel = downloadZipBtn.innerHTML;
      downloadZipBtn.innerHTML = '<span class="spin"></span>Zipping…';
      try{
        const JSZip = await waitForGlobal(()=> window.JSZip, 8000, 'Zip engine');
        const zip = new JSZip();
        ready.forEach(it=>{
          const base64 = it.outUrl.split(',')[1];
          zip.file(it.outName, base64, { base64: true });
        });
        const content = await zip.generateAsync({ type: 'base64' });
        const a = document.createElement('a');
        a.href = 'data:application/zip;base64,' + content;
        a.download = 'converted-images.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }catch(err){
        console.error(err);
        showErrorIn(errorMsg, 'Could not build the ZIP: ' + (err && err.message ? err.message : 'unknown error') + '. You can still download files one by one.');
      }finally{
        downloadZipBtn.disabled = false;
        downloadZipBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 4: MERGE PDFS ============================== */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneMerge');
    const fileInput = document.getElementById('fileInputMerge');
    const browseBtn = document.getElementById('browseBtnMerge');
    const sheetSection = document.getElementById('sheetSectionMerge');
    const framesEl = document.getElementById('framesMerge');
    const countTag = document.getElementById('countTagMerge');
    const statusText = document.getElementById('statusTextMerge');
    const mergeBtn = document.getElementById('mergeBtn');
    const clearBtn = document.getElementById('clearBtnMerge');
    const errorMsg = document.getElementById('errorMsgMerge');
    const resultEl = document.getElementById('resultMerge');
    const resultTitle = document.getElementById('resultTitleMerge');
    const resultSub = document.getElementById('resultSubMerge');
    const downloadBtn = document.getElementById('downloadMergeBtn');

    let docs = []; // {id, file, pageCount}
    let dragSrcId = null;

    async function acceptFiles(fileList){
      const files = Array.from(fileList).filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      if(files.length === 0 && fileList.length > 0){
        showErrorIn(errorMsg, 'Only PDF files are supported here.');
        return;
      }
      try{
        const PDFLib = await waitForGlobal(()=> window.PDFLib, 8000, 'PDF engine');
        for(const file of files){
          try{
            const buf = await readAsArrayBuffer(file);
            const pdfDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
            const id = 'm' + Date.now() + Math.random().toString(36).slice(2,8);
            docs.push({ id, file, pageCount: pdfDoc.getPageCount() });
          }catch(err){
            console.error(err);
            showErrorIn(errorMsg, 'Could not read "' + file.name + '": it may be corrupted or password-protected.');
          }
        }
      }catch(err){
        showErrorIn(errorMsg, 'The PDF engine could not load from the CDN. Check your internet connection and retry.');
        return;
      }
      resultEl.classList.remove('show');
      render();
    }

    function render(){
      sheetSection.style.display = docs.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      docs.forEach((d, idx)=>{
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.id = d.id;
        card.innerHTML = `
          <span class="drag-handle">⋮⋮</span>
          <div class="doc-thumb">${docIconSvg}</div>
          <div class="meta">
            <span class="fname" title="${d.file.name}">${idx+1}. ${d.file.name}</span>
            <button class="icon-btn remove" aria-label="Remove file" data-id="${d.id}">✕</button>
          </div>
        `;
        wireDrag(card, d.id, ()=>dragSrcId, (id)=>{dragSrcId=id;}, reorder);
        framesEl.appendChild(card);
      });
      framesEl.querySelectorAll('.remove').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          docs = docs.filter(d=>d.id !== btn.dataset.id);
          resultEl.classList.remove('show');
          render();
        });
      });
      const totalPages = docs.reduce((s,d)=>s+d.pageCount, 0);
      countTag.textContent = docs.length + (docs.length===1 ? ' file' : ' files');
      statusText.innerHTML = '<strong>' + docs.length + '</strong> file' + (docs.length===1?'':'s') + ' · ' + totalPages + ' total pages';
      mergeBtn.disabled = docs.length < 2;
    }

    function reorder(srcId, targetId){
      const srcIdx = docs.findIndex(d=>d.id===srcId);
      const targetIdx = docs.findIndex(d=>d.id===targetId);
      if(srcIdx === -1 || targetIdx === -1) return;
      const [moved] = docs.splice(srcIdx, 1);
      docs.splice(targetIdx, 0, moved);
      resultEl.classList.remove('show');
      render();
    }

    attachDropzone(dropzone, fileInput, browseBtn, acceptFiles);

    clearBtn.addEventListener('click', ()=>{
      docs = [];
      resultEl.classList.remove('show');
      render();
    });

    mergeBtn.addEventListener('click', async ()=>{
      if(docs.length < 2) return;
      mergeBtn.disabled = true;
      const originalLabel = mergeBtn.innerHTML;
      mergeBtn.innerHTML = '<span class="spin"></span>Merging…';

      try{
        const PDFLib = await waitForGlobal(()=> window.PDFLib, 8000, 'PDF engine');
        const merged = await PDFLib.PDFDocument.create();
        let totalPages = 0;

        for(const d of docs){
          const buf = await readAsArrayBuffer(d.file);
          const src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
          const indices = src.getPageIndices();
          const copied = await merged.copyPages(src, indices);
          copied.forEach(p => merged.addPage(p));
          totalPages += indices.length;
        }

        const bytes = await merged.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        resultTitle.textContent = 'merged.pdf';
        resultSub.textContent = totalPages + (totalPages===1?' page':' pages') + ' · ~' + formatMB(bytes.length) + ' MB';
        downloadBtn.href = url;
        downloadBtn.setAttribute('download', 'merged.pdf');
        resultEl.classList.add('show');
      }catch(err){
        console.error(err);
        if(err && /failed to load/.test(err.message)){
          showErrorIn(errorMsg, 'The PDF engine could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
        }else{
          showErrorIn(errorMsg, 'Something went wrong while merging: ' + (err && err.message ? err.message : 'unknown error') + '. Please try again.');
        }
      }finally{
        mergeBtn.disabled = docs.length < 2;
        mergeBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 5: SPLIT PDF ================================ */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneSplit');
    const fileInput = document.getElementById('fileInputSplit');
    const browseBtn = document.getElementById('browseBtnSplit');
    const sheetSection = document.getElementById('sheetSectionSplit');
    const framesEl = document.getElementById('framesSplit');
    const countTag = document.getElementById('countTagSplit');
    const statusText = document.getElementById('statusTextSplit');
    const clearBtn = document.getElementById('clearBtnSplit');
    const zipBtn = document.getElementById('zipBtnSplit');
    const errorMsg = document.getElementById('errorMsgSplit');
    const hintSplit = document.getElementById('hintSplit');

    let outputs = []; // {name, url, bytes}
    let sourceName = 'document';

    function render(){
      sheetSection.style.display = outputs.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      outputs.forEach((o, idx)=>{
        const card = document.createElement('div');
        card.className = 'file-card static';
        card.innerHTML = `
          <div class="doc-thumb">${docIconSvg}</div>
          <div class="meta">
            <span class="page-no">page ${idx+1}</span>
            <a class="icon-btn dl" href="${o.url}" download="${o.name}" aria-label="Download page ${idx+1}">↓</a>
          </div>
        `;
        framesEl.appendChild(card);
      });
      countTag.textContent = outputs.length + (outputs.length===1 ? ' page' : ' pages');
      statusText.innerHTML = '<strong>' + outputs.length + '</strong> page' + (outputs.length===1?'':'s') + ' ready';
      zipBtn.disabled = outputs.length === 0;
    }

    async function handleFile(file){
      if(!file) return;
      if(file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)){
        showErrorIn(errorMsg, 'Please choose a PDF file.');
        return;
      }
      outputs = [];
      sourceName = file.name.replace(/\.pdf$/i, '') || 'document';
      sheetSection.style.display = 'block';
      framesEl.innerHTML = '';
      hintSplit.textContent = 'Splitting…';
      zipBtn.disabled = true;
      statusText.innerHTML = '<strong>0</strong> pages ready';
      countTag.textContent = 'working…';

      try{
        const PDFLib = await waitForGlobal(()=> window.PDFLib, 8000, 'PDF engine');
        const buf = await readAsArrayBuffer(file);
        const src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        const total = src.getPageCount();

        for(let i=0; i<total; i++){
          hintSplit.textContent = 'Splitting page ' + (i+1) + ' of ' + total + '…';
          const out = await PDFLib.PDFDocument.create();
          const [copied] = await out.copyPages(src, [i]);
          out.addPage(copied);
          const bytes = await out.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const pad = String(i+1).padStart(String(total).length, '0');
          outputs.push({ name: sourceName + '-page-' + pad + '.pdf', url, bytes });
          render();
        }
        hintSplit.textContent = total + (total===1?' page':' pages') + ' split out — download individually or all together.';
      }catch(err){
        console.error(err);
        if(err && /failed to load/.test(err.message)){
          showErrorIn(errorMsg, 'The PDF engine could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
        }else{
          showErrorIn(errorMsg, 'Could not read that PDF: ' + (err && err.message ? err.message : 'unknown error') + '. It may be corrupted or password-protected.');
        }
        sheetSection.style.display = outputs.length ? 'block' : 'none';
      }
    }

    attachDropzone(dropzone, fileInput, browseBtn, (files)=> handleFile(files[0]));

    clearBtn.addEventListener('click', ()=>{
      outputs = [];
      render();
    });

    zipBtn.addEventListener('click', async ()=>{
      if(outputs.length === 0) return;
      zipBtn.disabled = true;
      const originalLabel = zipBtn.innerHTML;
      zipBtn.innerHTML = '<span class="spin"></span>Zipping…';
      try{
        const JSZip = await waitForGlobal(()=> window.JSZip, 8000, 'Zip engine');
        const zip = new JSZip();
        outputs.forEach(o=>{
          zip.file(o.name, o.bytes);
        });
        const content = await zip.generateAsync({ type: 'base64' });
        const a = document.createElement('a');
        a.href = 'data:application/zip;base64,' + content;
        a.download = sourceName + '-split.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }catch(err){
        console.error(err);
        showErrorIn(errorMsg, 'Could not build the ZIP: ' + (err && err.message ? err.message : 'unknown error') + '. You can still download pages one by one.');
      }finally{
        zipBtn.disabled = outputs.length === 0;
        zipBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 6: HEIC -> JPG/PNG ========================= */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneHeic');
    const fileInput = document.getElementById('fileInputHeic');
    const browseBtn = document.getElementById('browseBtnHeic');
    const sheetSection = document.getElementById('sheetSectionHeic');
    const framesEl = document.getElementById('framesHeic');
    const countTag = document.getElementById('countTagHeic');
    const statusText = document.getElementById('statusTextHeic');
    const convertBtn = document.getElementById('convertHeicBtn');
    const clearBtn = document.getElementById('clearBtnHeic');
    const errorMsg = document.getElementById('errorMsgHeic');
    const formatSeg = document.getElementById('heicFormat');
    const resultEl = document.getElementById('resultHeic');
    const resultTitle = document.getElementById('resultTitleHeic');
    const resultSub = document.getElementById('resultSubHeic');
    const downloadZipBtn = document.getElementById('downloadZipHeicBtn');

    let items = []; // {id, file, outUrl, outName, outBlob}
    let target = 'jpeg';

    wireSegmented(formatSeg, (fmt)=>{
      target = fmt;
      items.forEach(it=>{ it.outUrl = null; it.outBlob = null; });
      resultEl.classList.remove('show');
      render();
    });

    function acceptFiles(fileList){
      const files = Array.from(fileList).filter(f => /\.(heic|heif)$/i.test(f.name));
      if(files.length === 0 && fileList.length > 0){
        showErrorIn(errorMsg, 'Only .heic and .heif files are supported here.');
        return;
      }
      files.forEach(file=>{
        const id = 'h' + Date.now() + Math.random().toString(36).slice(2,8);
        items.push({id, file, outUrl:null, outName:null, outBlob:null});
      });
      resultEl.classList.remove('show');
      render();
    }

    function render(){
      sheetSection.style.display = items.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      items.forEach(it=>{
        const card = document.createElement('div');
        card.className = 'file-card static';
        if(it.outUrl){
          card.innerHTML = `
            <img class="thumb" src="${it.outUrl}" alt="${it.file.name}">
            <div class="meta">
              <span class="fname" title="${it.file.name}">${it.outName}</span>
              <button class="icon-btn remove" aria-label="Remove" data-id="${it.id}">✕</button>
            </div>
          `;
          const dl = document.createElement('a');
          dl.className = 'icon-btn dl';
          dl.href = it.outUrl;
          dl.setAttribute('download', it.outName);
          dl.setAttribute('aria-label', 'Download converted file');
          dl.textContent = '↓';
          dl.style.position = 'absolute';
          dl.style.top = '8px';
          dl.style.right = '8px';
          card.appendChild(dl);
        }else{
          card.innerHTML = `
            <div class="doc-thumb"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="11" rx="2"/><circle cx="7.5" cy="9" r="1.3"/><path d="M3 14l4-4 3 3 3-3 4 4"/></svg></div>
            <div class="meta">
              <span class="fname" title="${it.file.name}">${it.file.name}</span>
              <button class="icon-btn remove" aria-label="Remove" data-id="${it.id}">✕</button>
            </div>
          `;
        }
        framesEl.appendChild(card);
      });
      framesEl.querySelectorAll('.remove').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          items = items.filter(i=>i.id !== btn.dataset.id);
          resultEl.classList.remove('show');
          render();
        });
      });
      countTag.textContent = items.length + (items.length===1 ? ' file' : ' files');
      statusText.innerHTML = '<strong>' + items.length + '</strong> photo' + (items.length===1?'':'s') + ' ready';
      convertBtn.disabled = items.length === 0;
    }

    attachDropzone(dropzone, fileInput, browseBtn, acceptFiles);

    clearBtn.addEventListener('click', ()=>{
      items = [];
      resultEl.classList.remove('show');
      render();
    });

    function extFor(fmt){ return fmt === 'jpeg' ? 'jpg' : fmt; }

    convertBtn.addEventListener('click', async ()=>{
      if(items.length === 0) return;
      convertBtn.disabled = true;
      const originalLabel = convertBtn.innerHTML;
      convertBtn.innerHTML = '<span class="spin"></span>Converting…';
      const mime = 'image/' + target;
      const ext = extFor(target);
      const skipped = [];
      let done = 0;

      try{
        await waitForGlobal(()=> window.heic2any, 10000, 'HEIC engine');
        for(const it of items){
          try{
            let result = await window.heic2any({ blob: it.file, toType: mime, quality: 0.92 });
            const blob = Array.isArray(result) ? result[0] : result;
            const outUrl = URL.createObjectURL(blob);
            const baseName = it.file.name.replace(/\.[^.]+$/, '');
            it.outUrl = outUrl;
            it.outBlob = blob;
            it.outName = baseName + '.' + ext;
            done++;
          }catch(err){
            console.error(err);
            skipped.push(it.file.name);
          }
        }

        render();

        if(done > 0){
          resultTitle.textContent = 'Converted to ' + ext.toUpperCase();
          resultSub.textContent = done + (done===1?' file':' files') + ' ready to download';
          resultEl.classList.add('show');
        }
        if(skipped.length){
          showErrorIn(errorMsg, 'Skipped ' + skipped.length + ' file(s) that could not be converted: ' + skipped.join(', '));
        }
      }catch(err){
        console.error(err);
        showErrorIn(errorMsg, 'The HEIC engine could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
      }finally{
        convertBtn.disabled = items.length === 0;
        convertBtn.innerHTML = originalLabel;
      }
    });

    downloadZipBtn.addEventListener('click', async ()=>{
      const ready = items.filter(i=>i.outBlob);
      if(ready.length === 0) return;
      downloadZipBtn.disabled = true;
      const originalLabel = downloadZipBtn.innerHTML;
      downloadZipBtn.innerHTML = '<span class="spin"></span>Zipping…';
      try{
        const JSZip = await waitForGlobal(()=> window.JSZip, 8000, 'Zip engine');
        const zip = new JSZip();
        ready.forEach(it=>{ zip.file(it.outName, it.outBlob); });
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, 'converted-photos.zip');
      }catch(err){
        console.error(err);
        showErrorIn(errorMsg, 'Could not build the ZIP: ' + (err && err.message ? err.message : 'unknown error') + '. You can still download files one by one.');
      }finally{
        downloadZipBtn.disabled = false;
        downloadZipBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 7: SVG -> PNG/JPG =========================== */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneSvg');
    const fileInput = document.getElementById('fileInputSvg');
    const browseBtn = document.getElementById('browseBtnSvg');
    const sheetSection = document.getElementById('sheetSectionSvg');
    const framesEl = document.getElementById('framesSvg');
    const countTag = document.getElementById('countTagSvg');
    const statusText = document.getElementById('statusTextSvg');
    const convertBtn = document.getElementById('convertSvgBtn');
    const clearBtn = document.getElementById('clearBtnSvg');
    const errorMsg = document.getElementById('errorMsgSvg');
    const formatSeg = document.getElementById('svgFormat');
    const scaleSeg = document.getElementById('svgScale');
    const resultEl = document.getElementById('resultSvg');
    const resultTitle = document.getElementById('resultTitleSvg');
    const resultSub = document.getElementById('resultSubSvg');
    const downloadZipBtn = document.getElementById('downloadZipSvgBtn');

    let items = []; // {id, file, url, outUrl, outName}
    let target = 'png';
    let scale = 2;

    wireSegmented(formatSeg, (fmt)=>{
      target = fmt;
      items.forEach(it=>{ it.outUrl = null; });
      resultEl.classList.remove('show');
      render();
    });
    Array.from(scaleSeg.querySelectorAll('button')).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        scaleSeg.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        scale = parseInt(btn.dataset.scale, 10);
        items.forEach(it=>{ it.outUrl = null; });
        resultEl.classList.remove('show');
        render();
      });
    });

    async function acceptFiles(fileList){
      const files = Array.from(fileList).filter(f => /image\/svg\+xml/i.test(f.type) || /\.svg$/i.test(f.name));
      if(files.length === 0 && fileList.length > 0){
        showErrorIn(errorMsg, 'Only SVG files are supported here.');
        return;
      }
      for(const file of files){
        try{
          const url = await readAsDataURL(file);
          const id = 's' + Date.now() + Math.random().toString(36).slice(2,8);
          items.push({id, file, url, outUrl:null, outName:null});
        }catch(err){
          showErrorIn(errorMsg, err.message);
        }
      }
      resultEl.classList.remove('show');
      render();
    }

    function render(){
      sheetSection.style.display = items.length ? 'block' : 'none';
      framesEl.innerHTML = '';
      items.forEach(it=>{
        const card = document.createElement('div');
        card.className = 'file-card static';
        card.innerHTML = `
          <img class="thumb" src="${it.url}" alt="${it.file.name}" style="object-fit:contain; background:#fff;">
          <div class="meta">
            <span class="fname" title="${it.file.name}">${it.file.name}</span>
            <button class="icon-btn remove" aria-label="Remove" data-id="${it.id}">✕</button>
          </div>
        `;
        if(it.outUrl){
          const dl = document.createElement('a');
          dl.className = 'icon-btn dl';
          dl.href = it.outUrl;
          dl.setAttribute('download', it.outName);
          dl.setAttribute('aria-label', 'Download converted file');
          dl.textContent = '↓';
          dl.style.position = 'absolute';
          dl.style.top = '8px';
          dl.style.right = '8px';
          card.appendChild(dl);
        }
        framesEl.appendChild(card);
      });
      framesEl.querySelectorAll('.remove').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          items = items.filter(i=>i.id !== btn.dataset.id);
          resultEl.classList.remove('show');
          render();
        });
      });
      countTag.textContent = items.length + (items.length===1 ? ' file' : ' files');
      statusText.innerHTML = '<strong>' + items.length + '</strong> file' + (items.length===1?'':'s') + ' ready';
      convertBtn.disabled = items.length === 0;
    }

    attachDropzone(dropzone, fileInput, browseBtn, acceptFiles);

    clearBtn.addEventListener('click', ()=>{
      items = [];
      resultEl.classList.remove('show');
      render();
    });

    convertBtn.addEventListener('click', async ()=>{
      if(items.length === 0) return;
      convertBtn.disabled = true;
      const originalLabel = convertBtn.innerHTML;
      convertBtn.innerHTML = '<span class="spin"></span>Rendering…';
      const mime = 'image/' + target;
      const ext = target === 'jpeg' ? 'jpg' : target;
      const skipped = [];
      let done = 0;

      try{
        for(const it of items){
          try{
            const imgEl = await loadImage(it.url, it.file.name);
            const baseW = imgEl.naturalWidth || 512;
            const baseH = imgEl.naturalHeight || 512;
            const canvas = document.createElement('canvas');
            canvas.width = baseW * scale;
            canvas.height = baseH * scale;
            const ctx = canvas.getContext('2d');
            if(target === 'jpeg'){
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
            const outUrl = canvas.toDataURL(mime, 0.95);
            const baseName = it.file.name.replace(/\.[^.]+$/, '');
            it.outUrl = outUrl;
            it.outName = baseName + '.' + ext;
            done++;
          }catch(err){
            console.error(err);
            skipped.push(it.file.name);
          }
        }

        render();

        if(done > 0){
          resultTitle.textContent = 'Converted to ' + ext.toUpperCase();
          resultSub.textContent = done + (done===1?' file':' files') + ' ready to download';
          resultEl.classList.add('show');
        }
        if(skipped.length){
          showErrorIn(errorMsg, 'Skipped ' + skipped.length + ' file(s) that could not be rendered: ' + skipped.join(', '));
        }
      }finally{
        convertBtn.disabled = items.length === 0;
        convertBtn.innerHTML = originalLabel;
      }
    });

    downloadZipBtn.addEventListener('click', async ()=>{
      const ready = items.filter(i=>i.outUrl);
      if(ready.length === 0) return;
      downloadZipBtn.disabled = true;
      const originalLabel = downloadZipBtn.innerHTML;
      downloadZipBtn.innerHTML = '<span class="spin"></span>Zipping…';
      try{
        const JSZip = await waitForGlobal(()=> window.JSZip, 8000, 'Zip engine');
        const zip = new JSZip();
        ready.forEach(it=>{
          const base64 = it.outUrl.split(',')[1];
          zip.file(it.outName, base64, { base64: true });
        });
        const content = await zip.generateAsync({ type: 'base64' });
        const a = document.createElement('a');
        a.href = 'data:application/zip;base64,' + content;
        a.download = 'converted-svgs.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }catch(err){
        console.error(err);
        showErrorIn(errorMsg, 'Could not build the ZIP: ' + (err && err.message ? err.message : 'unknown error') + '. You can still download files one by one.');
      }finally{
        downloadZipBtn.disabled = false;
        downloadZipBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 8: PDF -> TEXT ============================== */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzonePdf2text');
    const fileInput = document.getElementById('fileInputPdf2text');
    const browseBtn = document.getElementById('browseBtnPdf2text');
    const sheetSection = document.getElementById('sheetSectionPdf2text');
    const output = document.getElementById('outputPdf2text');
    const countTag = document.getElementById('countTagPdf2text');
    const statusText = document.getElementById('statusTextPdf2text');
    const hint = document.getElementById('hintPdf2text');
    const errorMsg = document.getElementById('errorMsgPdf2text');
    const copyBtn = document.getElementById('copyBtnPdf2text');
    const downloadBtn = document.getElementById('downloadTxtBtn');

    let sourceName = 'document';
    let fullText = '';

    async function handleFile(file){
      if(!file) return;
      if(file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)){
        showErrorIn(errorMsg, 'Please choose a PDF file.');
        return;
      }
      sourceName = file.name.replace(/\.pdf$/i, '') || 'document';
      sheetSection.style.display = 'block';
      output.value = '';
      fullText = '';
      hint.textContent = 'Extracting…';
      countTag.textContent = 'working…';
      statusText.innerHTML = '<strong>0</strong> characters extracted';

      try{
        const pdfjsLib = await waitForGlobal(()=> window.pdfjsLib, 8000, 'PDF reader');
        if(!pdfjsLib.GlobalWorkerOptions.workerSrc){
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/legacy/build/pdf.worker.min.js';
        }
        const dataUrl = await readAsDataURL(file);
        const loadingTask = pdfjsLib.getDocument({ url: dataUrl });
        const pdf = await loadingTask.promise;
        const total = pdf.numPages;
        const parts = [];

        for(let i=1; i<=total; i++){
          hint.textContent = 'Extracting page ' + i + ' of ' + total + '…';
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(it => it.str).join(' ');
          parts.push('--- Page ' + i + ' ---\n' + pageText);
          fullText = parts.join('\n\n');
          output.value = fullText;
          countTag.textContent = i + ' / ' + total + ' pages';
        }

        hint.textContent = total + (total===1?' page':' pages') + ' extracted.';
        statusText.innerHTML = '<strong>' + fullText.length + '</strong> characters extracted';
        if(!fullText.replace(/---\s*Page\s*\d+\s*---/g,'').trim()){
          showErrorIn(errorMsg, 'No selectable text was found — this PDF may be a scanned image without a text layer.');
        }
      }catch(err){
        console.error(err);
        if(err && /failed to load/.test(err.message)){
          showErrorIn(errorMsg, 'The PDF reader could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
        }else{
          showErrorIn(errorMsg, 'Could not read that PDF: ' + (err && err.message ? err.message : 'unknown error') + '. It may be corrupted or password-protected.');
        }
      }
    }

    attachDropzone(dropzone, fileInput, browseBtn, (files)=> handleFile(files[0]));

    copyBtn.addEventListener('click', async ()=>{
      if(!fullText) return;
      try{
        await navigator.clipboard.writeText(fullText);
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(()=>{ copyBtn.textContent = original; }, 1500);
      }catch(err){
        showErrorIn(errorMsg, 'Could not copy automatically — select the text and copy manually.');
      }
    });

    downloadBtn.addEventListener('click', ()=>{
      if(!fullText) return;
      const blob = new Blob([fullText], { type: 'text/plain' });
      downloadBlob(blob, sourceName + '.txt');
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 9: TEXT -> PDF =============================== */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneText2pdf');
    const fileInput = document.getElementById('fileInputText2pdf');
    const browseBtn = document.getElementById('browseBtnText2pdf');
    const errorMsg = document.getElementById('errorMsgText2pdf');
    const inputText = document.getElementById('inputText2pdf');
    const pageSizeSelect = document.getElementById('text2pdfPageSize');
    const fontSizeSelect = document.getElementById('text2pdfFontSize');
    const statusText = document.getElementById('statusTextText2pdf');
    const generateBtn = document.getElementById('generatePdfBtn');
    const resultEl = document.getElementById('resultText2pdf');
    const resultTitle = document.getElementById('resultTitleText2pdf');
    const resultSub = document.getElementById('resultSubText2pdf');
    const downloadBtn = document.getElementById('downloadText2pdfBtn');

    function updateStatus(){
      const len = inputText.value.length;
      statusText.innerHTML = '<strong>' + len + '</strong> character' + (len===1?'':'s');
      generateBtn.disabled = len === 0;
    }
    inputText.addEventListener('input', ()=>{ resultEl.classList.remove('show'); updateStatus(); });
    updateStatus();

    async function handleFile(file){
      if(!file) return;
      if(!/\.(txt|md)$/i.test(file.name) && file.type && !/^text\//.test(file.type)){
        showErrorIn(errorMsg, 'Please choose a .txt or .md file.');
        return;
      }
      try{
        const text = await readAsText(file);
        inputText.value = text;
        resultEl.classList.remove('show');
        updateStatus();
      }catch(err){
        showErrorIn(errorMsg, err.message);
      }
    }

    attachDropzone(dropzone, fileInput, browseBtn, (files)=> handleFile(files[0]));

    generateBtn.addEventListener('click', async ()=>{
      const text = inputText.value;
      if(!text) return;
      generateBtn.disabled = true;
      const originalLabel = generateBtn.innerHTML;
      generateBtn.innerHTML = '<span class="spin"></span>Building PDF…';

      try{
        const jsPDF = window.jspdf ? window.jspdf.jsPDF : (await waitForGlobal(()=> window.jspdf && window.jspdf.jsPDF, 8000, 'PDF engine'));
        const format = pageSizeSelect.value;
        const fontSize = parseInt(fontSizeSelect.value, 10);
        const doc = new jsPDF({ unit: 'pt', format: format });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 54;
        const maxW = pageW - margin*2;
        const lineHeight = fontSize * 1.4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);

        const paragraphs = text.split('\n');
        let y = margin;
        paragraphs.forEach(para=>{
          const lines = para.length ? doc.splitTextToSize(para, maxW) : [''];
          lines.forEach(line=>{
            if(y + lineHeight > pageH - margin){
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += lineHeight;
          });
        });

        const pageCount = doc.internal.getNumberOfPages();
        const dataUri = doc.output('datauristring');
        const sizeMB = formatMB(dataUri.length * 0.75);
        resultTitle.textContent = 'document.pdf';
        resultSub.textContent = pageCount + (pageCount===1?' page':' pages') + ' · ~' + sizeMB + ' MB';
        downloadBtn.href = dataUri;
        downloadBtn.setAttribute('download', 'document.pdf');
        resultEl.classList.add('show');
      }catch(err){
        console.error(err);
        if(err && /failed to load/.test(err.message)){
          showErrorIn(errorMsg, 'The PDF engine could not load from the CDN. Check your internet connection or try disabling any ad-blocker/script-blocker for this page, then retry.');
        }else{
          showErrorIn(errorMsg, 'Something went wrong while building the PDF: ' + (err && err.message ? err.message : 'unknown error') + '. Please try again.');
        }
      }finally{
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalLabel;
      }
    });
  })();

  /* =================================================================== */
  /* ================= TOOL 10: CSV <-> JSON ============================= */
  /* =================================================================== */
  (function(){
    const dropzone = document.getElementById('dropzoneCsvJson');
    const fileInput = document.getElementById('fileInputCsvJson');
    const browseBtn = document.getElementById('browseBtnCsvJson');
    const errorMsg = document.getElementById('errorMsgCsvJson');
    const directionSeg = document.getElementById('csvJsonDirection');
    const inputArea = document.getElementById('inputCsvJson');
    const outputArea = document.getElementById('outputCsvJson');
    const inputLabel = document.getElementById('inputLabelCsvJson');
    const outputLabel = document.getElementById('outputLabelCsvJson');
    const statusText = document.getElementById('statusTextCsvJson');
    const resultStatus = document.getElementById('resultStatusCsvJson');
    const convertBtn = document.getElementById('convertCsvJsonBtn');
    const copyBtn = document.getElementById('copyBtnCsvJson');
    const downloadBtn = document.getElementById('downloadCsvJsonBtn');

    let direction = 'csv2json';
    let lastResult = null; // {text, filename, mime}

    function updateLabels(){
      inputLabel.textContent = direction === 'csv2json' ? 'Or paste CSV directly' : 'Or paste JSON directly';
      outputLabel.textContent = direction === 'csv2json' ? 'Result (JSON)' : 'Result (CSV)';
      inputArea.placeholder = direction === 'csv2json'
        ? 'name,age,city\nAva,29,Austin\nLee,34,Reno'
        : '[\n  {"name":"Ava","age":29,"city":"Austin"},\n  {"name":"Lee","age":34,"city":"Reno"}\n]';
    }
    updateLabels();

    Array.from(directionSeg.querySelectorAll('button')).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        directionSeg.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        direction = btn.dataset.dir;
        updateLabels();
        outputArea.value = '';
        lastResult = null;
        resultStatus.textContent = '';
      });
    });

    function updateStatus(){
      const len = inputArea.value.length;
      statusText.innerHTML = '<strong>' + len + '</strong> character' + (len===1?'':'s');
      convertBtn.disabled = len === 0;
    }
    inputArea.addEventListener('input', updateStatus);
    updateStatus();

    async function handleFile(file){
      if(!file) return;
      try{
        const text = await readAsText(file);
        if(/\.json$/i.test(file.name)){
          direction = 'json2csv';
        }else if(/\.csv$/i.test(file.name)){
          direction = 'csv2json';
        }
        directionSeg.querySelectorAll('button').forEach(b=>{
          b.classList.toggle('active', b.dataset.dir === direction);
        });
        updateLabels();
        inputArea.value = text;
        outputArea.value = '';
        lastResult = null;
        resultStatus.textContent = '';
        updateStatus();
      }catch(err){
        showErrorIn(errorMsg, err.message);
      }
    }

    attachDropzone(dropzone, fileInput, browseBtn, (files)=> handleFile(files[0]));

    /* --- CSV parsing (handles quoted fields, embedded commas/newlines) --- */
    function parseCSV(str){
      const rows = [];
      let row = [];
      let field = '';
      let inQuotes = false;
      for(let i=0; i<str.length; i++){
        const c = str[i];
        if(inQuotes){
          if(c === '"'){
            if(str[i+1] === '"'){ field += '"'; i++; }
            else{ inQuotes = false; }
          }else{ field += c; }
        }else{
          if(c === '"'){ inQuotes = true; }
          else if(c === ','){ row.push(field); field = ''; }
          else if(c === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
          else if(c === '\r'){ /* skip */ }
          else{ field += c; }
        }
      }
      row.push(field);
      rows.push(row);
      return rows.filter(r => !(r.length===1 && r[0]===''));
    }
    function csvToJson(str){
      const rows = parseCSV(str.trim());
      if(rows.length === 0) return '[]';
      const headers = rows[0];
      const records = rows.slice(1).map(r=>{
        const obj = {};
        headers.forEach((h, i)=>{ obj[h] = r[i] !== undefined ? r[i] : ''; });
        return obj;
      });
      return JSON.stringify(records, null, 2);
    }
    function csvField(val){
      const s = (val === null || val === undefined) ? '' : String(val);
      if(/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    function jsonToCsv(str){
      const data = JSON.parse(str);
      const arr = Array.isArray(data) ? data : [data];
      const headerSet = [];
      arr.forEach(obj=>{
        Object.keys(obj || {}).forEach(k=>{ if(headerSet.indexOf(k) === -1) headerSet.push(k); });
      });
      const lines = [headerSet.map(csvField).join(',')];
      arr.forEach(obj=>{
        lines.push(headerSet.map(h => csvField(obj ? obj[h] : '')).join(','));
      });
      return lines.join('\n');
    }

    convertBtn.addEventListener('click', ()=>{
      const raw = inputArea.value;
      if(!raw.trim()){ return; }
      try{
        if(direction === 'csv2json'){
          const out = csvToJson(raw);
          outputArea.value = out;
          lastResult = { text: out, filename: 'converted.json', mime: 'application/json' };
        }else{
          const out = jsonToCsv(raw);
          outputArea.value = out;
          lastResult = { text: out, filename: 'converted.csv', mime: 'text/csv' };
        }
        resultStatus.innerHTML = '<strong>' + outputArea.value.length + '</strong> characters generated';
      }catch(err){
        console.error(err);
        outputArea.value = '';
        lastResult = null;
        resultStatus.textContent = '';
        showErrorIn(errorMsg, 'Could not convert: ' + (err && err.message ? err.message : 'invalid input') + (direction === 'json2csv' ? '. Make sure the input is valid JSON — an array of objects works best.' : '.'));
      }
    });

    copyBtn.addEventListener('click', async ()=>{
      if(!outputArea.value) return;
      try{
        await navigator.clipboard.writeText(outputArea.value);
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(()=>{ copyBtn.textContent = original; }, 1500);
      }catch(err){
        showErrorIn(errorMsg, 'Could not copy automatically — select the text and copy manually.');
      }
    });

    downloadBtn.addEventListener('click', ()=>{
      if(!lastResult) return;
      const blob = new Blob([lastResult.text], { type: lastResult.mime });
      downloadBlob(blob, lastResult.filename);
    });
  })();

  /* =================================================================== */
  /* =================================================================== */
  /* =================================================================== */
  })();
