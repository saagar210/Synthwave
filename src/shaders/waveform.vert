#version 300 es
precision highp float;

uniform sampler2D u_waveform;
uniform float u_rms;
uniform float u_beatIntensity;
uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec2 u_resolution;

out vec4 vColor;

void main() {
    int totalVerts = 1024;
    // Each pair of vertices forms top/bottom of a thick line
    int sampleIndex = gl_VertexID / 2;
    int side = gl_VertexID % 2; // 0 = top, 1 = bottom

    float t = float(sampleIndex) / float(totalVerts - 1);
    float sample = texelFetch(u_waveform, ivec2(sampleIndex, 0), 0).r;

    float x = t * 2.0 - 1.0;
    float y = sample * (0.6 + 0.3 * u_rms);

    // Thickness varies with beat
    float thickness = (2.0 + 4.0 * u_beatIntensity) / u_resolution.y;
    y += (float(side) * 2.0 - 1.0) * thickness;

    gl_Position = vec4(x, y, 0.0, 1.0);

    float glow = 1.0 - abs(float(side) * 2.0 - 1.0) * 0.3;
    vec3 color = mix(u_primary, u_secondary, t) * glow;
    color += u_beatIntensity * 0.3;
    vColor = vec4(color, glow);
}
