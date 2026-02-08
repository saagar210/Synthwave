#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_intensity;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec4 scene = texture(u_scene, vUv);
    vec4 bloom = texture(u_bloom, vUv);
    fragColor = scene + bloom * u_intensity;
}
