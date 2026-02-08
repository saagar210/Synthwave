#version 300 es
precision highp float;

uniform sampler2D u_spectrum;
uniform float u_time;
uniform float u_rms;
uniform float u_beatIntensity;
uniform vec2 u_resolution;
uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec3 u_accent;

in vec2 vUv;
out vec4 fragColor;

const float PI = 3.14159265;
const float TAU = 6.28318530;

void main() {
    vec2 center = vec2(0.5);
    vec2 pos = vUv - center;
    pos.x *= u_resolution.x / u_resolution.y;

    float dist = length(pos);
    float angle = atan(pos.y, pos.x) + PI;

    float rotation = u_time * 0.2;
    float sampleAngle = mod(angle + rotation, TAU) / TAU;

    // Mirror for symmetry
    if (sampleAngle > 0.5) sampleAngle = 1.0 - sampleAngle;
    sampleAngle *= 2.0;

    // Log mapping
    float logT = pow(sampleAngle, 2.0);
    int texCoord = int(logT * 1024.0);
    float spectrum = texelFetch(u_spectrum, ivec2(texCoord, 0), 0).r;

    float baseRadius = 0.15 + 0.05 * u_beatIntensity;
    float outerRadius = baseRadius + spectrum * 0.25 * (1.0 + u_rms);

    // Ring with glow
    float ringDist = abs(dist - outerRadius);
    float glow = 0.003 / (ringDist + 0.003);
    glow *= smoothstep(baseRadius - 0.05, baseRadius, dist);

    // Inner glow
    float innerGlow = smoothstep(baseRadius, 0.0, dist) * 0.15 * (1.0 + u_beatIntensity);

    vec3 color = mix(u_primary, u_secondary, sampleAngle);
    color = mix(color, u_accent, spectrum * 0.5);

    vec3 finalColor = color * glow + color * innerGlow;
    finalColor += u_beatIntensity * color * 0.1;

    fragColor = vec4(finalColor, 1.0);
}
