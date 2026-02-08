#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_intensity;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec3 scene = texture(u_scene, vUv).rgb;
    vec3 bloom = texture(u_bloom, vUv).rgb;
    vec3 combined = scene + bloom * u_intensity;
    // Reinhard tonemapping: preserves values < 1, compresses highlights
    combined = combined / (combined + vec3(1.0));
    fragColor = vec4(combined, 1.0);
}
