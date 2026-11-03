import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

// Hand-authored illustrative fixtures, isolated from the real accounting system.
const data = {
  projects: [
    { id: 'pet', name: 'PET26', revenue: 150000, cost: 98200, booths: 2 },
    { id: 'propak', name: 'ProPak Asia 2026', revenue: 890000, cost: 735000, booths: 3 },
    { id: 'thaifex', name: 'Thaifex 2026', revenue: 780000, cost: 600000, booths: 4 },
    { id: 'whx', name: 'WHX 2026', revenue: 330000, cost: 350000, booths: 1 }
  ],
  overhead: 75000,
  trend: [
    { month: 'พ.ย. 69', revenue: 680000, cost: 480000, profit: 160000 },
    { month: 'ธ.ค. 69', revenue: 860000, cost: 590000, profit: 220000 },
    { month: 'ม.ค. 70', revenue: 990000, cost: 700000, profit: 285000 },
    { month: 'ก.พ. 70', revenue: 1000000, cost: 740000, profit: 360000 },
    { month: 'มี.ค. 70', revenue: 1130000, cost: 800000, profit: 440000 },
    { month: 'เม.ย. 70', revenue: 1320000, cost: 990000, profit: 520000 }
  ]
};
const totals = data.projects.reduce((a, p) => ({ revenue: a.revenue + p.revenue, cost: a.cost + p.cost }), { revenue: 0, cost: 0 });
const profit = totals.revenue - totals.cost;
console.assert(totals.revenue === 2150000, 'Revenue sum mismatch');
console.assert(totals.cost === 1783200, 'Cost sum mismatch');
console.assert(profit === 366800 && profit - data.overhead === 291800, 'Profit mismatch');
console.assert((profit / totals.revenue * 100).toFixed(1) === '17.1', 'Margin mismatch');
console.assert(Math.abs(data.projects.reduce((sum, p) => sum + p.revenue / totals.revenue, 0) - 1) < 1e-10, 'Shares must sum to 100%');
const money = value => Math.round(value).toLocaleString('en-US');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const captureMode = params.has('capture');
const tooltip = document.querySelector('#tooltip');
const renderers = [];
const frames = [];
window.__READY__ = false;
window.__DATA__ = { ...data, totals: { ...totals, profit, net: profit - data.overhead } };
window.__WEBGL__ = [];

function makeRenderer(id) {
  const canvas = document.getElementById(id);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderers.push(renderer);
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  window.__WEBGL__.push({ id, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) });
  return renderer;
}
function studio(scene, renderer) {
  const generator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = generator.fromScene(room, .045).texture;
  scene.environmentIntensity = .75;
  room.dispose(); generator.dispose();
  scene.add(new THREE.HemisphereLight(0xf7fbff, 0x34517a, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(-3, 6, 8); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8ecaff, 1.1);
  fill.position.set(4, 1, 5); scene.add(fill);
}
function showTooltip(html, x, y) {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  const box = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.max(8, Math.min(x + 16, innerWidth - box.width - 10))}px`;
  tooltip.style.top = `${Math.max(8, Math.min(y + 16, innerHeight - box.height - 10))}px`;
}
function hideTooltip() { tooltip.hidden = true; }

// The sidebar is a continuous silk surface. Each signed curve contributes a
// soft, one-sided satin fold plus a narrow white-blue specular edge.
function buildSilk() {
  const renderer = makeRenderer('silk-canvas');
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  camera.position.z = 1;
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAspect: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAspect;
      float fold(float y, float curve, float width){
        float d=y-curve;
        return exp(-abs(d)/width)*smoothstep(-.002,.005,d);
      }
      void main(){
        vec2 p=vec2(vUv.x,1.-vUv.y);
        float t=uTime*.035;
        float drift=sin(t)*.004;
        vec3 color=mix(vec3(.035,.095,.18),vec3(.045,.135,.26),p.y);
        color+=vec3(.015,.026,.044)*sin(p.x*2.+p.y*5.);
        float c1=.092-.106*sqrt(max(p.x+.02,0.))+drift;
        float c2=.143-.052*sqrt(max(p.x,0.))+drift*.5;
        float c3=.562-.078*p.x-.014*sin(p.x*2.1)+drift;
        float c4=.787-.29*p.x+.008*p.x*p.x+drift;
        float c5=.799-.094*sqrt(max(p.x,0.))+drift*.6;
        float c6=.79-.17*sqrt(max(p.x,0.))+drift*.7;
        float satin=fold(p.y,c1,.026)*.24+fold(p.y,c2,.018)*.22;
        satin+=fold(p.y,c3,.056)*.42+fold(p.y,c4,.027)*.67;
        satin+=fold(p.y,c5,.038)*.32+fold(p.y,c6,.037)*.17;
        color+=vec3(.13,.25,.42)*satin*1.28;
        float edge1=exp(-abs(p.y-c1)*2100.)*.17;
        float edge2=exp(-abs(p.y-c2)*2000.)*.22*exp(-pow((p.x-.51)/.38,2.));
        float edge3=exp(-abs(p.y-c3)*2100.)*.36*exp(-pow((p.x-.78)/.2,2.));
        float edge4=exp(-abs(p.y-c4)*1450.)*.85*exp(-pow((p.x-.39)/.33,2.));
        float edge5=exp(-abs(p.y-c5)*2000.)*.66*exp(-pow((p.x-.56)/.32,2.));
        float edge6=exp(-abs(p.y-c6)*2200.)*.18;
        float glow=exp(-pow((p.y-c4)/.018,2.))*exp(-pow((p.x-.44)/.3,2.))*.27;
        glow+=exp(-pow((p.y-c5)/.016,2.))*exp(-pow((p.x-.68)/.24,2.))*.26;
        glow+=exp(-pow((p.y-c3)/.006,2.))*exp(-pow((p.x-.80)/.14,2.))*.20;
        color+=vec3(.54,.78,1.)*(edge1+edge2+edge3+edge4+edge5+edge6+glow)*2.25;
        float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        color+=(grain-.5)*.004;
        float sparkle=pow(max(0.,sin(p.x*123.+p.y*312.+t)),80.)*pow(max(0.,sin(p.x*43.-p.y*211.)),80.);
        color+=vec3(.5,.7,1.)*sparkle*.015;
        gl_FragColor=vec4(color,1.);
      }`
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const resize = () => {
    const host = document.querySelector('.sidebar');
    const w = host.clientWidth, h = innerWidth <= 760 ? 84 : host.clientHeight;
    renderer.setSize(w, h, false);
    material.uniforms.uAspect.value = w / h;
  };
  new ResizeObserver(resize).observe(document.querySelector('.sidebar')); resize();
  frames.push(time => { material.uniforms.uTime.value = reducedMotion || captureMode ? 2 : time; renderer.render(scene, camera); });
}

function buildTrend() {
  const renderer = makeRenderer('trend-canvas');
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  studio(scene, renderer);
  const camera = new THREE.OrthographicCamera(0, 600, 240, 0, .1, 2000);
  camera.position.set(0, 0, 1000);
  const group = new THREE.Group(); scene.add(group);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const barMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: .30, roughness: .25, clearcoat: 1, clearcoatRoughness: .14, envMapIntensity: .65 });
  const costMaterial = new THREE.MeshPhysicalMaterial({ color: 0x9daec7, metalness: .05, roughness: .45, transparent: true, opacity: .86, clearcoat: 1, depthWrite: false });
  const goldMaterial = new THREE.MeshPhysicalMaterial({ color: 0xefa919, metalness: .55, roughness: .19, clearcoat: 1, envMapIntensity: .45, emissive: 0xd99b1a, emissiveIntensity: .10 });
  let picks = [], bars = [], lineObjects = [], layout = null;
  function resize() {
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.right = w; camera.top = h; camera.updateProjectionMatrix();
    group.children.slice().forEach(obj => { group.remove(obj); obj.geometry?.dispose(); });
    picks = []; bars = []; lineObjects = [];
    const mobile = w < 400;
    const left = mobile ? 38 : 66, right = 2, bottom = mobile ? 31 : 33, top = 27;
    const plotHeight = h - bottom - top;
    const step = (w - left - right) / 6;
    const barWidth = Math.min(mobile ? 16 : 29, step * .34);
    const pointPositions = [];
    const axis = document.querySelector('#axis-layer'); axis.replaceChildren();
    const labels = ['0', '400K', '800K', '1.2M', '1.6M'];
    labels.forEach((text, i) => {
      const y = h - bottom - plotHeight * i / 4;
      const line = document.createElement('div'); line.className = 'gridline'; line.style.top = `${y}px`; line.style.left = `${left}px`; axis.append(line);
      const label = document.createElement('span'); label.className = 'y-tick'; label.textContent = text; label.style.top = `${y}px`; axis.append(label);
    });
    data.trend.forEach((d, i) => {
      const x = left + step * (i + .5);
      const shift = barWidth * .45;
      const yRevenue = plotHeight * d.revenue / 1600000;
      const yCost = plotHeight * d.cost / 1600000;
      const cost = new THREE.Mesh(new RoundedBoxGeometry(barWidth + 2, yCost, 8, 3, 3), costMaterial);
      cost.position.set(x + shift, bottom + yCost / 2, -10); group.add(cost);
      cost.userData = { month: d.month, name: 'ต้นทุน', value: d.cost }; picks.push(cost);
      bars.push({ mesh: cost, height: yCost, bottom });
      const barGeometry = new RoundedBoxGeometry(barWidth, yRevenue, 13, 5, 4.2);
      const positions = barGeometry.attributes.position;
      const colors = new Float32Array(positions.count * 3);
      const base = new THREE.Color(0x061f3b), topColor = new THREE.Color(0x10457e);
      for (let v = 0; v < positions.count; v++) {
        const height = THREE.MathUtils.clamp((positions.getY(v) + yRevenue / 2) / yRevenue, 0, 1);
        const c = base.clone().lerp(topColor, Math.pow(height, 1.6));
        c.multiplyScalar(.86 + .14 * (1 - positions.getX(v) / barWidth));
        colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b;
      }
      barGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set(x - shift, bottom + yRevenue / 2, 0); group.add(bar);
      bar.userData = { month: d.month, name: 'รายรับ', value: d.revenue }; picks.push(bar);
      bars.push({ mesh: bar, height: yRevenue, bottom });
      const pt = new THREE.Vector3(x, bottom + plotHeight * d.profit / 1600000, 18);
      pointPositions.push(pt);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(mobile ? 4 : 6.6, 24, 16), goldMaterial);
      sphere.position.copy(pt); group.add(sphere); picks.push(sphere); lineObjects.push(sphere);
      sphere.userData = { month: d.month, name: 'กำไร', value: d.profit };
      // Screen-space labels are aligned to the projected sphere, not guessed.
      const projected = pt.clone().project(camera);
      const label = document.createElement('span'); label.className = 'x-tick'; label.textContent = d.month;
      label.style.left = `${(projected.x * .5 + .5) * w}px`; label.style.top = `${h - bottom + 7}px`; axis.append(label);
    });
    const curve = new THREE.CatmullRomCurve3(pointPositions, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 100, mobile ? 1.25 : 1.75, 8, false), goldMaterial);
    group.add(tube); lineObjects.push(tube);
    layout = { w, h, left, bottom, plotHeight, step };
    window.__TREND_TARGETS__ = picks.map(obj => {
      const v = obj.position.clone().project(camera);
      return { ...obj.userData, x: (v.x * .5 + .5) * w, y: (-v.y * .5 + .5) * h };
    });
  }
  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(picks, false)[0];
    if (!hit) { hideTooltip(); canvas.style.cursor = 'default'; return; }
    canvas.style.cursor = 'pointer';
    const d = hit.object.userData;
    showTooltip(`<strong>${d.month} · ${d.name}</strong><br>${money(d.value)} บาท<br><small>แนวโน้ม — ข้อมูลตัวอย่าง</small>`, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', hideTooltip);
  new ResizeObserver(resize).observe(canvas.parentElement); resize();
  frames.push((time, growth) => {
    bars.forEach(({ mesh, height, bottom }) => { mesh.scale.y = Math.max(.001, growth); mesh.position.y = bottom + height * growth / 2; });
    lineObjects.forEach(obj => { obj.visible = growth > .65; });
    renderer.render(scene, camera);
  });
}

function buildDonut() {
  const renderer = makeRenderer('donut-canvas');
  const canvas = renderer.domElement;
  const scene = new THREE.Scene(); studio(scene, renderer);
  renderer.toneMappingExposure = 1.06;
  const camera = new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, .1, 50);
  camera.position.set(0, 0, 10);
  const group = new THREE.Group(); scene.add(group);
  const order = ['propak', 'thaifex', 'pet', 'whx'];
  const colors = [0x032654, 0x519ae1, 0xf3a714, 0xaeb3bf];
  const picks = [];
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let angle = Math.PI / 2;
  let hovered = null;
  order.forEach((id, i) => {
    const d = data.projects.find(p => p.id === id);
    const fraction = d.revenue / totals.revenue;
    const end = angle - fraction * Math.PI * 2;
    const gap = .003;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 1.4, angle - gap, end + gap, true);
    shape.absarc(0, 0, .98, end + gap, angle - gap, false);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: true, bevelThickness: .018, bevelSize: .018, bevelSegments: 3, steps: 1, curveSegments: 80 });
    const material = new THREE.MeshPhysicalMaterial({ color: colors[i], vertexColors: true, metalness: .23, roughness: .23, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: .65 });
    const positions = geometry.attributes.position;
    const shading = new Float32Array(positions.count * 3);
    for (let v = 0; v < positions.count; v++) {
      const x = positions.getX(v), y = positions.getY(v);
      const radial = Math.sqrt(x*x+y*y);
      const intensity = .58 + .25 * (y + 1.4) / 2.8 + .17 * (radial - .98) / .42;
      shading[v*3] = intensity; shading[v*3+1] = intensity; shading[v*3+2] = intensity;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(shading, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { id, name: d.name, value: d.revenue, share: (fraction * 100).toFixed(1), angle: (angle + end) / 2 };
    group.add(mesh); picks.push(mesh);
    document.querySelector(`[data-share="${id}"]`).textContent = `${mesh.userData.share}%`;
    angle = end;
  });
  // A softly blurred contact shadow follows the extruded ring, with no raster art.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 256; shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 70, 128, 128, 126);
  gradient.addColorStop(0, 'rgba(10,35,65,0)'); gradient.addColorStop(.45, 'rgba(10,35,65,.13)'); gradient.addColorStop(.8, 'rgba(10,35,65,.045)'); gradient.addColorStop(1, 'rgba(10,35,65,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.position.set(0, -.06, -.18); scene.add(shadow);
  const resize = () => {
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    const halfWidth = 1.45;
    const halfHeight = halfWidth * h / w;
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas.parentElement); resize();
  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(picks, false)[0];
    hovered = hit?.object || null;
    if (!hovered) { hideTooltip(); canvas.style.cursor = 'default'; return; }
    canvas.style.cursor = 'pointer';
    const d = hovered.userData;
    showTooltip(`<strong>${d.name}</strong><br>${money(d.value)} บาท · ${d.share}%`, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; hideTooltip(); });
  frames.push((time, growth) => {
    const idle = captureMode || reducedMotion ? 0 : time;
    group.rotation.x = .12 + Math.sin(idle * .32) * .015;
    group.rotation.y = -.08 + Math.sin(idle * .27) * .015;
    group.rotation.z = Math.sin(idle * .20) * .012;
    group.position.y = Math.sin(idle * .45) * .012;
    picks.forEach(mesh => {
      const lift = mesh === hovered ? .085 : 0;
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, Math.cos(mesh.userData.angle) * lift, .12);
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, Math.sin(mesh.userData.angle) * lift, .12);
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, mesh === hovered ? .12 : 0, .12);
    });
    group.scale.setScalar(.96 + .04 * growth);
    renderer.render(scene, camera);
    window.__DONUT_TARGETS__ = picks.map(mesh => {
      const v = new THREE.Vector3(Math.cos(mesh.userData.angle) * 1.2, Math.sin(mesh.userData.angle) * 1.2, .15);
      group.localToWorld(v); v.project(camera);
      return { id: mesh.userData.id, x: (v.x * .5 + .5) * canvas.clientWidth, y: (-v.y * .5 + .5) * canvas.clientHeight };
    });
  });
}

function interactions() {
  const toast = document.querySelector('.toast');
  let toastTimer;
  function notify(text) { clearTimeout(toastTimer); toast.textContent = text; toast.classList.add('show'); toastTimer = setTimeout(() => toast.classList.remove('show'), 3600); }
  const dialog = document.querySelector('dialog');
  const openDialog = (title, text) => { dialog.querySelector('h2').textContent = title; dialog.querySelector('p').textContent = text; dialog.showModal(); };
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  document.querySelector('#profit-button').addEventListener('click', () => openDialog('กำไรขาดทุนบริษัท', `รายรับ ${money(totals.revenue)} บาท − ต้นทุน ${money(totals.cost)} บาท − ส่วนกลาง ${money(data.overhead)} บาท = กำไรสุทธิ ${money(profit - data.overhead)} บาท · ข้อมูลตัวอย่าง`));
  document.querySelector('#create-button').addEventListener('click', () => openDialog('สร้างโปรเจกต์', 'นี่คือหน้าตัวอย่างการออกแบบ ยังไม่มีการบันทึกหรือเชื่อมต่อข้อมูลบัญชีจริง'));
  document.querySelector('.bell').addEventListener('click', () => notify('ไม่มีการแจ้งเตือนใหม่ · หน้าตัวอย่าง'));
  document.querySelector('.company').addEventListener('click', () => notify('TIME (สำนักงานใหญ่) · 0105556128862'));
  document.querySelector('.mobile-menu').addEventListener('click', e => {
    const open = document.querySelector('.sidebar').classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
    e.currentTarget.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
  });
  document.querySelectorAll('.nav-item').forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    if (!link.classList.contains('active')) notify(`${link.textContent.trim()} · หน้านี้เป็นตัวอย่างเฉพาะโปรเจกต์`);
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
  }));
  document.querySelectorAll('.expand').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.getElementById(button.getAttribute('aria-controls')).hidden = !open;
  }));
  document.querySelectorAll('.view-toggle button').forEach(button => button.addEventListener('click', () => {
    const grid = button.id === 'grid-view';
    document.querySelector('.projects').classList.toggle('grid-view', grid);
    document.querySelectorAll('.view-toggle button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  }));
  const search = document.querySelector('#project-search');
  function filterProjects() {
    const query = search.value.toLowerCase().trim();
    const november = document.querySelector('[aria-label="ช่วงเวลา"]').selectedIndex === 1;
    let shown = 0;
    document.querySelectorAll('.project-row').forEach(row => {
      const details = document.querySelector(`#booth-${row.dataset.project}`);
      const match = (row.textContent + details.textContent).toLowerCase().includes(query) && (!november || ['propak', 'whx'].includes(row.dataset.project));
      row.style.display = match ? '' : 'none';
      if (match) shown++;
      details.hidden = !match || row.querySelector('.expand').getAttribute('aria-expanded') !== 'true';
    });
    document.querySelector('.empty-result').hidden = shown !== 0;
  }
  search.addEventListener('input', filterProjects);
  document.querySelectorAll('.filter select').forEach(select => select.addEventListener('change', () => {
    filterProjects(); notify('ปรับรายการตัวอย่างแล้ว · ยอดสรุปแสดงทุกโปรเจกต์');
  }));
  const categories = ['ค่าติดไฟ', 'ค่าโครงสร้าง(รวมขนส่ง)', 'ค่าเฟอร์นิเจอร์', 'ค่าออแกไนซ์', 'ค่าของใช้อื่นๆตามรีเควสลูกค้า'];
  document.querySelectorAll('.cost-bar').forEach(bar => {
    const text = `<strong>หมวดต้นทุน · สัดส่วนตัวอย่าง</strong><br>${categories.join('<br>')}`;
    bar.addEventListener('pointermove', e => showTooltip(text, e.clientX, e.clientY));
    bar.addEventListener('pointerleave', hideTooltip);
    bar.addEventListener('focus', () => { const r = bar.getBoundingClientRect(); showTooltip(text, r.left, r.top); });
    bar.addEventListener('blur', hideTooltip);
  });
}

try {
  await document.fonts.ready;
  buildSilk(); buildTrend(); buildDonut(); interactions();
  const start = performance.now();
  let frameCount = 0;
  const numberNodes = [...document.querySelectorAll('[data-count]')];
  function animate(now) {
    const elapsed = (now - start) / 1000;
    const p = reducedMotion ? 1 : Math.min(1, elapsed / 1.4);
    const growth = 1 - Math.pow(1 - p, 3);
    if (p < 1 || frameCount < 3) numberNodes.forEach(node => { node.textContent = money(Number(node.dataset.count) * growth); });
    if (p >= 1) numberNodes.forEach(node => { node.textContent = money(Number(node.dataset.count)); });
    frames.forEach(render => render(elapsed, growth));
    frameCount++;
    if (p === 1 && frameCount > 3) window.__READY__ = true;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  window.__CANVAS_CHECK__ = () => renderers.map(renderer => {
    const c = renderer.domElement, gl = renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let count = 0, sum = 0, square = 0, alpha = 0;
    for (let i = 0; i < pixels.length; i += 64) { const v = pixels[i] + pixels[i + 1] + pixels[i + 2]; sum += v; square += v * v; alpha += pixels[i + 3] > 0 ? 1 : 0; count++; }
    return { id: c.id, width: c.clientWidth, height: c.clientHeight, bufferWidth: w, bufferHeight: h, variance: square / count - (sum / count) ** 2, nonTransparentFraction: alpha / count };
  });
} catch (error) {
  window.__ERROR__ = String(error);
  console.error(error);
  const note = document.querySelector('.sample-note');
  note.textContent = 'WebGL ไม่พร้อมใช้งาน — โปรดเปิดด้วยเบราว์เซอร์ที่รองรับ WebGL 2';
}
