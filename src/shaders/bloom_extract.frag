#version 300 es
precision highp float;

uniform sampler2D u_scene;
uniform float u_threshold;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec4 color = texture(u_scene, vUv);
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    if (brightness > u_threshold) {
        fragColor = color;
    } else {
        fragColor = vec4(0.0);
    }
}
