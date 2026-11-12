// Simplex 3D noise by Ian McEwan / Ashima Arts (MIT).
const noise = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const palette = /* glsl */ `
uniform vec3 uPalC;
uniform vec3 uPalD;
vec3 pal(float t){return 0.5+0.5*cos(6.28318*(uPalC*t+uPalD));}
`;

export const blobVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
${noise}
float field(vec3 p){
  return snoise(p*uFreq+vec3(0.0,uTime*0.22,0.0))*0.72
       + snoise(p*uFreq*2.4+vec3(uTime*0.35))*0.28;
}
vec3 displace(vec3 p){return p+normalize(p)*field(p)*uAmp;}
void main(){
  // Rebuild the normal from two displaced neighbours on the unit sphere.
  vec3 n=normalize(position);
  vec3 t=normalize(cross(n,abs(n.y)<0.99?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0)));
  vec3 b=cross(n,t);
  float e=0.012;
  vec3 p=displace(n);
  vec3 pt=displace(normalize(n+t*e));
  vec3 pb=displace(normalize(n+b*e));
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vNormal=normalMatrix*normalize(cross(pt-p,pb-p));
  vView=-mv.xyz;
  vNoise=field(n);
  gl_Position=projectionMatrix*mv;
}
`;

export const blobFragment = /* glsl */ `
uniform float uTime;
uniform float uHue;
uniform float uGain;
varying vec3 vNormal;
varying vec3 vView;
varying float vNoise;
${palette}
void main(){
  vec3 N=normalize(vNormal);
  vec3 V=normalize(vView);
  float ndv=clamp(dot(N,V),0.0,1.0);
  float fres=pow(1.0-ndv,2.6);
  vec3 film=pal(vNoise*0.28+fres*0.55+uHue+uTime*0.015);
  vec3 col=vec3(0.012,0.014,0.03)+film*(0.10+fres*1.25);
  vec3 L1=normalize(vec3(0.6,0.8,0.7));
  vec3 L2=normalize(vec3(-0.8,-0.3,0.4));
  col+=pal(uHue+0.08)*pow(max(dot(N,normalize(L1+V)),0.0),60.0)*0.9;
  col+=pal(uHue+0.45)*pow(max(dot(N,normalize(L2+V)),0.0),24.0)*0.25;
  gl_FragColor=vec4(col*uGain,1.0);
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir=normalize(position);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

export const skyFragment = /* glsl */ `
uniform float uTime;
uniform float uHue;
varying vec3 vDir;
${noise}
${palette}
void main(){
  float n=snoise(vDir*1.3+vec3(0.0,0.0,uTime*0.015))*0.65+snoise(vDir*3.1-vec3(uTime*0.02))*0.35;
  vec3 col=vec3(0.018,0.021,0.036)+pal(n*0.25+uHue+0.35)*smoothstep(-0.1,0.9,n)*0.055;
  gl_FragColor=vec4(col,1.0);
}
`;

export const starVertex = /* glsl */ `
uniform float uTime;
uniform float uPointScale;
attribute float aSeed;
varying float vAlpha;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  float twinkle=0.6+0.4*sin(uTime*(0.6+aSeed*1.8)+aSeed*40.0);
  vAlpha=twinkle*smoothstep(26.0,6.0,-mv.z);
  gl_PointSize=(1.0+aSeed*2.6)*uPointScale/-mv.z;
  gl_Position=projectionMatrix*mv;
}
`;

export const starFragment = /* glsl */ `
uniform float uHue;
varying float vAlpha;
${palette}
void main(){
  float d=length(gl_PointCoord-0.5);
  float a=smoothstep(0.5,0.0,d);
  gl_FragColor=vec4(mix(vec3(1.0),pal(uHue+0.1),0.35)*a*a*vAlpha,1.0);
}
`;
