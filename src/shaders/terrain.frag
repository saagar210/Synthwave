#version 300 es
precision highp float;

in float vHeight;
in vec2 vGridPos;
in vec3 vBarycentric;

uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec3 u_accent;
uniform vec3 u_background;

out vec4 fragColor;

void main() {
    // Wireframe via barycentric coordinates
    float minBary = min(min(vBarycentric.x, vBarycentric.y), vBarycentric.z);
    float wire = smoothstep(0.0, 0.02, minBary);

    vec3 wireColor = mix(u_primary, u_accent, vHeight);
    vec3 fillColor = u_background * 1.5;

    vec3 color = mix(wireColor, fillColor, wire * 0.85);

    // Fade with distance (z)
    float fade = smoothstep(1.0, 0.3, vGridPos.y);
    color *= fade;

    fragColor = vec4(color, 1.0);
}
