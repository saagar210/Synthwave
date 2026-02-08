#version 300 es
precision highp float;

uniform sampler2D u_spectrum;
uniform float u_beatIntensity;
uniform int u_barCount;
uniform vec2 u_resolution;

out float vHeight;
out float vBarT;
out float vLocalY;

void main() {
    // Each bar = 4 vertices (triangle strip: 2 triangles)
    int barIndex = gl_InstanceID;
    int vertexInBar = gl_VertexID;

    float barT = float(barIndex) / float(u_barCount);

    // Logarithmic frequency mapping
    float logT = pow(barT, 2.0);
    int texCoord = int(logT * 1024.0);
    float height = texelFetch(u_spectrum, ivec2(texCoord, 0), 0).r;

    float barWidth = 2.0 / float(u_barCount) * 0.8;
    float gap = 2.0 / float(u_barCount) * 0.2;
    float barX = -1.0 + barT * 2.0 + gap * 0.5;

    // Vertex positions within bar
    float localX = float(vertexInBar % 2) * barWidth;
    float localY = float(vertexInBar / 2) * height;

    float x = barX + localX;
    float y = -0.8 + localY * 1.6;

    gl_Position = vec4(x, y, 0.0, 1.0);

    vHeight = height;
    vBarT = barT;
    vLocalY = float(vertexInBar / 2);
}
