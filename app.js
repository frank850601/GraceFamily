import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),host=$('#viewport');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});}catch(e){$('#progress').textContent='無法啟動 WebGL，請使用支援硬體加速的瀏覽器。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xe8ece7);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.03,500),controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.dampingFactor=.08;controls.maxDistance=65;controls.minDistance=.3;controls.autoRotateSpeed=.55;
scene.add(new THREE.HemisphereLight(0xfffaf0,0x859788,1.35));const sun=new THREE.DirectionalLight(0xfff1dc,2.1);sun.position.set(5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.bias=-.0002;sun.shadow.normalBias=.025;scene.add(sun);const fill=new THREE.DirectionalLight(0xe0edff,.55);fill.position.set(-9,7,-5);scene.add(fill);
const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),2.65),meshes=[],furniture=[];let model,selected,boxHelper,center=new THREE.Vector3(),size=new THREE.Vector3(),view='home';
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
function setView(v){if(!model)return;view=v;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));controls.target.copy(center);camera.up.set(0,1,0);const d=Math.max(size.x,size.z)*1.05/Math.min(camera.aspect,1);
 if(v==='top'){camera.position.set(center.x,center.y+d*1.2,center.z+.001);camera.up.set(0,0,-1);}else if(v==='front'){camera.position.set(center.x,center.y+2,center.z+d*1.45);}else if(v==='inside'){camera.position.set(center.x+size.x*.30,1.6,center.z+size.z*.18);controls.target.set(center.x+size.x*.30,1.5,center.z-size.z*.25);}else{camera.position.set(center.x+d*.72,center.y+d*.70,center.z+d*.85);}controls.update();}
function clear(){selected=null;if(boxHelper){scene.remove(boxHelper);boxHelper.geometry.dispose();boxHelper.material.dispose();boxHelper=null;}$('#selection').hidden=true;}
new GLTFLoader().load('./assets/model.glb',g=>{model=g.scene;const box=new THREE.Box3().setFromObject(model),c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;model.position.y-=box.min.y;scene.add(model);model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model);bounds.getCenter(center);bounds.getSize(size);center.y=.8;
 model.traverse(o=>{if(!o.isMesh)return;meshes.push(o);o.castShadow=true;o.receiveShadow=true;if(!o.geometry.groups.length)o.geometry.addGroup(0,o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count,0);o.material=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{m=m.clone();m.side=THREE.DoubleSide;m.clippingPlanes=[clip];m.clipShadows=true;return m;});if(/櫃|柜|床|吧台|椅|角鋼|冰箱|沙發|Enscape/.test(o.name))furniture.push(o);});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:0xe1e6df,roughness:1}));ground.receiveShadow=true;ground.rotation.x=-Math.PI/2;ground.position.y=bounds.min.y-.02;scene.add(ground);
 $('#status').textContent=`愛瑰蘭 / ${meshes.length} 個模型物件`;$('#dimensions').textContent=`FBX 範圍 ${size.x.toFixed(2)} × ${size.z.toFixed(2)} × ${size.y.toFixed(2)} m`;$('#loading').hidden=true;setView('home');
},p=>{$('#progress').textContent=p.total?`載入 ${Math.round(100*p.loaded/p.total)}%`:`已讀取 ${(p.loaded/1048576).toFixed(1)} MB`;},e=>{console.error(e);$('#progress').textContent='模型載入失敗。請透過本地伺服器開啟，並確認 assets/model.glb 存在。';});
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#rotate').onchange=e=>controls.autoRotate=e.target.checked;
$('#wire').onchange=e=>meshes.forEach(o=>o.material.forEach(m=>m.wireframe=e.target.checked));
$('#furniture').onchange=e=>{clear();furniture.forEach(o=>o.visible=e.target.checked);};
$('#cut').oninput=e=>{clip.constant=Number(e.target.value);$('#cutValue').textContent=`${clip.constant.toFixed(2)} m`;clear();};
$('#reset').onclick=()=>{clear();$('#rotate').checked=false;controls.autoRotate=false;$('#wire').checked=false;meshes.forEach(o=>o.material.forEach(m=>m.wireframe=false));$('#furniture').checked=true;furniture.forEach(o=>o.visible=true);$('#cut').value=2.65;clip.constant=2.65;$('#cutValue').textContent='2.65 m';setView('home');};
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes,false).find(h=>h.object.visible&&h.point.y<=clip.constant);clear();if(!hit)return;selected=hit.object;boxHelper=new THREE.BoxHelper(selected,0xb68342);boxHelper.material.clippingPlanes=[clip];scene.add(boxHelper);$('#selection').hidden=false;$('#objectName').textContent=selected.name.replace(/_Geometry| Geometry/g,'');const s=new THREE.Box3().setFromObject(selected).getSize(new THREE.Vector3());$('#objectSize').textContent=`外框 ${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)} m`;});
$('#clear').onclick=clear;$('#focus').onclick=()=>{if(!selected)return;const b=new THREE.Box3().setFromObject(selected),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());controls.target.copy(c);const d=Math.max(s.length(),2);camera.position.copy(c).add(new THREE.Vector3(d*.8,d*.5,d));controls.update();};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await host.requestFullscreen();}catch(e){$('#status').textContent='此瀏覽器不支援全螢幕';}};
$('#capture').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='愛瑰蘭-3D.png';a.click();};
const gallery=$('#gallery');$('#photos').onclick=()=>gallery.showModal();$('#closeGallery').onclick=()=>gallery.close();gallery.addEventListener('click',e=>{if(e.target===gallery){const r=gallery.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)gallery.close();}});
const photoNames=[...Array.from({length:7},(_,i)=>`LINE_ALBUM_1130627 塑膠地磚完成_261024_${i+1}.jpg`),...Array.from({length:9},(_,i)=>`11306-林森豪宅 (${i+1}).jpg`)];photoNames.forEach((n,i)=>{const f=document.createElement('figure'),im=new Image();im.src='./assets/photos/'+encodeURIComponent(n);im.alt=i<7?`地坪完工空間紀錄 ${i+1}`:`現場空間紀錄 ${i-6}`;im.loading='lazy';const caption=document.createElement('figcaption');caption.textContent=im.alt;f.append(im,caption);$('#photoGrid').append(f);});






