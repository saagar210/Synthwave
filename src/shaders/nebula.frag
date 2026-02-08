#version 300 es
precision highp float;

uniform float u_time;
uniform float u_rms;
uniform float u_centroid;
uniform float u_beatIntensity;
uniform vec2 u_resolution;
uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec3 u_accent;
uniform vec3 u_background;
uniform sampler2D u_spectrum;

in vec2 vUv;
out vec4 fragColor;

// Simplex-like 3D noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vec2 uv = vUv;
    uv.x *= u_resolution.x / u_resolution.y;

    float t = u_time * 0.1;

    // Camera orbit
    vec3 camPos = vec3(sin(t) * 2.0, cos(t * 0.7) * 0.5, cos(t) * 2.0);
    vec3 target = vec3(0.0);
    vec3 forward = normalize(target - camPos);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec3 rayDir = normalize(forward + (uv.x - 0.5) * right + (uv.y - 0.5) * up);

    // Sample some spectrum bins for variation
    float specLow = texelFetch(u_spectrum, ivec2(10, 0), 0).r;
    float specMid = texelFetch(u_spectrum, ivec2(100, 0), 0).r;
    float specHigh = texelFetch(u_spectrum, ivec2(300, 0), 0).r;

    // Raymarching
    vec3 color = u_background;
    float density = 0.0;
    float stepSize = 0.12;

    vec3 pos = camPos;
    for (int i = 0; i < 32; i++) {
        pos += rayDir * stepSize;

        float n1 = snoise(pos * 1.0 + t) * 0.5 + 0.5;
        float n2 = snoise(pos * 2.0 - t * 0.5) * 0.5 + 0.5;
        float n3 = snoise(pos * 4.0 + t * 0.3) * 0.5 + 0.5;

        float d = n1 * (0.5 + specLow * 0.5) + n2 * (0.3 + specMid * 0.3) + n3 * (0.1 + specHigh * 0.2);
        d = max(d - 0.4, 0.0) * (1.0 + u_rms * 2.0);

        // Expansion pulse on beat
        float beatPulse = 1.0 + u_beatIntensity * 0.3;
        d *= beatPulse;

        vec3 sampleColor = mix(u_primary, u_secondary, n1);
        sampleColor = mix(sampleColor, u_accent, n2 * u_centroid);

        color += sampleColor * d * stepSize * 0.8;
        density += d * stepSize;

        if (density > 2.0) break;
    }

    color *= 1.0 + u_beatIntensity * 0.2;

    fragColor = vec4(color, 1.0);
}
