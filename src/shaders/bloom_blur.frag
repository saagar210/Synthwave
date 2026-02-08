#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_direction;
uniform vec2 u_resolution;

in vec2 vUv;
out vec4 fragColor;

void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec4 result = vec4(0.0);

    // 9-tap Gaussian
    float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

    result += texture(u_texture, vUv) * weights[0];
    for (int i = 1; i < 5; i++) {
        vec2 offset = u_direction * texelSize * float(i) * 2.0;
        result += texture(u_texture, vUv + offset) * weights[i];
        result += texture(u_texture, vUv - offset) * weights[i];
    }

    fragColor = result;
}
