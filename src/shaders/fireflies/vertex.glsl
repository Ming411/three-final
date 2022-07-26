uniform float uPixelRatio;
uniform float uSize;
uniform float uTime;
attribute float aScale;
void main(){
  vec4 modelPosition = modelMatrix * vec4(position,1.0);
  //  * aScale * 0.2 控制运动速率
  modelPosition.y += sin(uTime + modelPosition.x * 100.0) * aScale * 0.2;
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectionPosition = projectionMatrix * viewPosition;

  gl_Position = projectionPosition;
  gl_PointSize = uSize * aScale * uPixelRatio;
  // 使粒子具有近大远小的效果
  // 不使用着色器时可以在基础材质中配置 sizeAttenuation: true
  gl_PointSize *= (1.0 /- viewPosition.z);
}