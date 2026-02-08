#version 300 es
precision highp float;

uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec3 u_accent;
uniform float u_beatIntensity;

in float vHeight;
in float vBarT;
in float vLocalY;

out vec4 fragColor;

void main() {
    vec3 color = mix(u_primary, u_secondary, vBarT);
    color = mix(color, u_accent, vHeight * 0.5);
    color *= 0.7 + 0.3 * vLocalY; // gradient from bottom to top
    color += u_beatIntensity * 0.15;
    fragColor = vec4(color, 1.0);
}
