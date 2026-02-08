#version 300 es
precision highp float;

uniform float u_time;
uniform float u_rms;
uniform float u_beatIntensity;
uniform vec2 u_resolution;
uniform vec3 u_primary;
uniform vec3 u_secondary;
uniform vec3 u_accent;
uniform vec3 u_background;
uniform sampler2D u_spectrum;

in vec2 vUv;
out vec4 fragColor;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec2 uv = (vUv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);

    float speed = 0.3 + u_rms * 1.5 + u_beatIntensity * 3.0;
    vec3 color = u_background;

    // Multiple star layers for depth
    for (int layer = 0; layer < 4; layer++) {
        float depth = 1.0 + float(layer) * 0.5;
        float layerScale = 20.0 + float(layer) * 15.0;
        float layerSpeed = speed / depth;

        vec2 st = uv * layerScale;
        st.y -= u_time * layerSpeed;

        // Warp on beat
        st += u_beatIntensity * 0.5 * uv * depth;

        vec2 cell = floor(st);
        vec2 frac_st = fract(st) - 0.5;

        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= 1; dy++) {
                vec2 neighbor = vec2(float(dx), float(dy));
                vec2 cellPos = cell + neighbor;

                float rnd = hash21(cellPos);
                if (rnd > 0.85) {
                    vec2 offset = vec2(hash21(cellPos + 0.1), hash21(cellPos + 0.2)) - 0.5;
                    vec2 diff = neighbor + offset - frac_st;
                    float dist = length(diff);

                    // Brightness linked to spectrum
                    int specBin = int(rnd * 512.0);
                    float specVal = texelFetch(u_spectrum, ivec2(specBin, 0), 0).r;

                    float brightness = 0.003 / (dist * dist + 0.003);
                    brightness *= 0.5 + specVal * 1.5;
                    brightness *= (0.5 + rnd * 0.5) / depth;

                    // Twinkle
                    brightness *= 0.8 + 0.2 * sin(u_time * (2.0 + rnd * 3.0) + rnd * 6.28);

                    vec3 starColor = mix(u_primary, u_secondary, rnd);
                    starColor = mix(starColor, u_accent, specVal);

                    color += starColor * brightness;
                }
            }
        }
    }

    fragColor = vec4(color, 1.0);
}
