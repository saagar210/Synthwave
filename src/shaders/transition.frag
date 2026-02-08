#version 300 es
precision highp float;

uniform sampler2D u_snapshot;
uniform float u_alpha;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec4 color = texture(u_snapshot, vUv);
    fragColor = vec4(color.rgb, u_alpha);
}
