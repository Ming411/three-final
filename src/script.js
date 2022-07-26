import './style.css';
import * as dat from 'lil-gui';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';

import firefliesVertex from './shaders/fireflies/vertex.glsl';
import firefliesFragement from './shaders/fireflies/fragement.glsl';
import portalVertex from './shaders/portal/vertex.glsl';
import portalFragement from './shaders/portal/fragement.glsl';

// 分析模型渲染的插件
// const SPECTOR = require('spectorjs');
// const spector = new SPECTOR.Spector();
// spector.displayUI();
// 对模型进行优化，一些不需要改变的模型可以将其合并成一个，这样可以减少渲染次数
/**
 * Base
 */
// Debug
const gui = new dat.GUI({
  width: 400
});
const debugObject = {};
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader();

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');

// GLTF loader
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
// 加载纹理
const bakedTexture = textureLoader.load('baked.jpg');
bakedTexture.flipY = false; // 禁止纹理底图镜像翻转
// 纹理的编码方式采用srgb方式，需要renderer也采用这种方式才有效
bakedTexture.encoding = THREE.sRGBEncoding;
// 创建整体模型材质
const bakedMaterial = new THREE.MeshBasicMaterial({map: bakedTexture});
// 创建模型中间圆环灯材质
debugObject.portalColorStart = 'black';
debugObject.portalColorEnd = 'white';
gui.addColor(debugObject, 'portalColorStart').onChange(() => {
  portalLightMaterial.uniforms.uColorStart.value.set(debugObject.portalColorStart);
});
gui.addColor(debugObject, 'portalColorEnd').onChange(() => {
  portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd);
});
const portalLightMaterial = new THREE.ShaderMaterial({
  vertexShader: portalVertex,
  fragmentShader: portalFragement,
  // wireframe: true
  uniforms: {
    uTime: {
      value: 0
    },
    uColorStart: {value: new THREE.Color(debugObject.portalColorStart)},
    uColorEnd: {value: new THREE.Color(debugObject.portalColorEnd)}
  }
});

// 创建模型中灯的材质
const poleLightMaterial = new THREE.MeshBasicMaterial({color: 0xffffe5});
// 加载模型
gltfLoader.load('portal.glb', gltf => {
  // gltf.scene.traverse(child => {
  //   // 默认模型采用的是标准材质，无光就是黑色
  //   child.material = bakedMaterial;
  // });
  // baked、 poleLightA等名字是在创建模型时给灯的名字
  const bakedtMesh = gltf.scene.children.find(child => child.name === 'baked');
  const portalLightMesh = gltf.scene.children.find(child => child.name === 'portalLight');
  const poleLightAMesh = gltf.scene.children.find(child => child.name === 'poleLightA');
  const poleLightBMesh = gltf.scene.children.find(child => child.name === 'poleLightB');
  bakedtMesh.material = bakedMaterial; // 设置整个模型大体材质
  portalLightMesh.material = portalLightMaterial;
  poleLightAMesh.material = poleLightMaterial;
  poleLightBMesh.material = poleLightMaterial;
  // console.log(portalLightMesh, poleLightAMesh, poleLightBMesh);
  scene.add(gltf.scene);
});
// 创建粒子制作萤火虫效果
const firefliesGeometry = new THREE.BufferGeometry();
const firefliesCount = 30;
const positionArray = new Float32Array(firefliesCount * 3); // 三个坐标构成一个点
const scaleArray = new Float32Array(firefliesCount); // 制造大小不同的萤火虫
for (let i = 0; i < firefliesCount; i++) {
  // -0.5 是为了位置与模型重合
  positionArray[i * 3 + 0] = (Math.random() - 0.5) * 4;
  positionArray[i * 3 + 1] = Math.random() * 1.5;
  positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4;

  scaleArray[i] = Math.random();
}
firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1));
const firefliesMaterial = new THREE.ShaderMaterial({
  uniforms: {
    // 使用粒子的必要操作 解决屏幕像素比不同而带来的展示效果不同
    // 并且需要在窗口尺寸变换时进行更新
    uPixelRatio: {value: Math.min(window.devicePixelRatio, 2)},
    uSize: {
      // 用于控制粒子的大小
      value: 100
    },
    uTime: {
      // 让萤火虫上下运动
      value: 0
    }
  },
  transparent: true,
  vertexShader: firefliesVertex,
  fragmentShader: firefliesFragement,
  // 当数量较多时不建议使用，因为对性能消耗大
  blending: THREE.AdditiveBlending, // 将物体本身的颜色与场景颜色融合
  depthWrite: false // 解决前面的物体会挡住后面物体的问题
});
gui.add(firefliesMaterial.uniforms.uSize, 'value').min(0).max(500).step(1).name('萤火虫大小');

const firefliesPoints = new THREE.Points(firefliesGeometry, firefliesMaterial);
scene.add(firefliesPoints);
/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 更新传递个shader的像素比
  firefliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.x = 4;
camera.position.y = 2;
camera.position.z = 4;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
debugObject.clearColor = '#201919';
renderer.setClearColor(debugObject.clearColor); // renderer 整体背景色
gui.addColor(debugObject, 'clearColor').onChange(() => {
  renderer.setClearColor(debugObject.clearColor);
});
/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  firefliesMaterial.uniforms.uTime.value = elapsedTime;
  portalLightMaterial.uniforms.uTime.value = elapsedTime;
  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
