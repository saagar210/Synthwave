#version 300 es
precision highp float;

uniform sampler2D u_spectrum;
uniform sampler2D u_history;
uniform mat4 u_viewProj;
uniform float u_time;
uniform float u_beatIntensity;
uniform int u_gridSize;
uniform int u_historyOffset;
uniform int u_historySize;

out float vHeight;
out vec2 vGridPos;
out vec3 vBarycentric;

void main() {
    int gridSize = u_gridSize;
    int quadIndex = gl_VertexID / 6;
    int vertInQuad = gl_VertexID % 6;

    int qx = quadIndex % (gridSize - 1);
    int qz = quadIndex / (gridSize - 1);

    // Triangle indices within quad
    int dx, dz;
    if (vertInQuad == 0) { dx = 0; dz = 0; }
    else if (vertInQuad == 1) { dx = 1; dz = 0; }
    else if (vertInQuad == 2) { dx = 0; dz = 1; }
    else if (vertInQuad == 3) { dx = 1; dz = 0; }
    else if (vertInQuad == 4) { dx = 1; dz = 1; }
    else { dx = 0; dz = 1; }

    int ix = qx + dx;
    int iz = qz + dz;

    float fx = float(ix) / float(gridSize - 1);
    float fz = float(iz) / float(gridSize - 1);

    // Sample spectrum history for height
    int historyRow = (u_historyOffset + iz) % u_historySize;
    float logFreq = pow(fx, 2.0);
    int texCoord = int(logFreq * 1024.0);
    float height = texelFetch(u_history, ivec2(texCoord, historyRow), 0).r;
    height *= 1.0 + u_beatIntensity * 0.5;

    float x = (fx - 0.5) * 4.0;
    float z = (fz - 0.5) * 4.0 - u_time * 0.5;
    float y = height * 1.5 - 0.8;

    gl_Position = u_viewProj * vec4(x, y, z, 1.0);

    vHeight = height;
    vGridPos = vec2(fx, fz);

    // Barycentric for wireframe
    int bary = vertInQuad % 3;
    if (bary == 0) vBarycentric = vec3(1.0, 0.0, 0.0);
    else if (bary == 1) vBarycentric = vec3(0.0, 1.0, 0.0);
    else vBarycentric = vec3(0.0, 0.0, 1.0);
}
