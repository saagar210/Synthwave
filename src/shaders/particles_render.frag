#version 300 es
precision highp float;

in float vLife;
in float vCentroid;
uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec3 u_accent;

out vec4 fragColor;

void main() {
    // Soft circle
    vec2 coord = gl_PointCoord * 2.0 - 1.0;
    float dist = length(coord);
    if (dist > 1.0) discard;

    float alpha = smoothstep(1.0, 0.3, dist);
    alpha *= clamp(vLife * 0.5, 0.0, 1.0);

    vec3 color = mix(u_primary, u_secondary, vCentroid);
    color = mix(color, u_accent, smoothstep(2.0, 0.0, vLife));

    fragColor = vec4(color * alpha, alpha);
}
