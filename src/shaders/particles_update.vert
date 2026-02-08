#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_velocity;
in float a_life;
in float a_size;

uniform float u_deltaTime;
uniform float u_rms;
uniform float u_centroid;
uniform float u_beatIntensity;
uniform float u_time;

out vec3 v_position;
out vec3 v_velocity;
out float v_life;
out float v_size;

// Simple hash for pseudo-random
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

void main() {
    float dt = u_deltaTime;
    vec3 pos = a_position;
    vec3 vel = a_velocity;
    float life = a_life - dt;
    float size = a_size;

    if (life <= 0.0) {
        // Respawn from center
        float id = float(gl_VertexID);
        float angle = hash(id + u_time) * 6.28318;
        float angle2 = hash(id * 1.7 + u_time) * 3.14159 - 1.5708;
        float speed = (0.5 + hash(id * 2.3 + u_time) * 1.5) * (1.0 + u_beatIntensity * 3.0);

        pos = vec3(0.0);
        vel = vec3(
            cos(angle) * cos(angle2) * speed,
            sin(angle2) * speed,
            sin(angle) * cos(angle2) * speed
        );
        vel *= 0.3 + u_rms * 2.0;
        life = 1.0 + hash(id * 3.1) * 3.0;
        size = 2.0 + hash(id * 4.7) * 4.0;
    } else {
        // Update position
        pos += vel * dt;

        // Slight gravity/drag
        vel *= 0.998;
        vel.y -= 0.02 * dt;
    }

    v_position = pos;
    v_velocity = vel;
    v_life = life;
    v_size = size;
}
