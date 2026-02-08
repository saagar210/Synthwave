#version 300 es
precision highp float;

in vec3 a_position;
in float a_life;
in float a_size;

uniform mat4 u_viewProj;
uniform float u_beatIntensity;
uniform float u_centroid;

out float vLife;
out float vCentroid;

void main() {
    vLife = a_life;
    vCentroid = u_centroid;

    vec4 pos = u_viewProj * vec4(a_position, 1.0);
    gl_Position = pos;
    gl_PointSize = a_size * (1.0 + u_beatIntensity) * (2.0 / max(pos.w, 0.1));
}
