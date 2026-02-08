import { ShaderProgram } from "./shaderProgram";
import updateVert from "../shaders/particles_update.vert?raw";
import renderVert from "../shaders/particles_render.vert?raw";
import renderFrag from "../shaders/particles_render.frag?raw";

const PARTICLE_COUNT = 50000;
const FLOATS_PER_PARTICLE = 8; // pos(3) + vel(3) + life(1) + size(1)

// Dummy fragment shader for transform feedback (no output needed)
const TF_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0); }
`;

export class ParticleSystem {
  private updateProgram: ShaderProgram | null = null;
  private renderProgram: ShaderProgram;
  private vaos: [WebGLVertexArrayObject, WebGLVertexArrayObject];
  private buffers: [WebGLBuffer, WebGLBuffer];
  private tfos: [WebGLTransformFeedback, WebGLTransformFeedback];
  private currentIndex = 0;
  private useCpuFallback = false;
  private cpuData: Float32Array | null = null;

  constructor(private gl: WebGL2RenderingContext) {
    this.renderProgram = new ShaderProgram(gl, renderVert, renderFrag);

    // Try transform feedback first
    try {
      this.updateProgram = this.createTFProgram(gl);
    } catch {
      console.warn("Transform feedback not available, using CPU fallback");
      this.useCpuFallback = true;
    }

    // Create double-buffered VAOs
    const buf0 = this.createBuffer(gl);
    const buf1 = this.createBuffer(gl);
    this.buffers = [buf0, buf1];

    // Initialize with random data
    const initData = new Float32Array(PARTICLE_COUNT * FLOATS_PER_PARTICLE);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const base = i * FLOATS_PER_PARTICLE;
      initData[base + 6] = 0; // life = 0 → will respawn immediately
      initData[base + 7] = 2.0 + Math.random() * 4.0; // size
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf0);
    gl.bufferData(gl.ARRAY_BUFFER, initData, gl.DYNAMIC_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf1);
    gl.bufferData(gl.ARRAY_BUFFER, initData, gl.DYNAMIC_COPY);

    if (this.useCpuFallback) {
      this.cpuData = new Float32Array(initData);
    }

    // Create VAOs for rendering
    this.vaos = [this.createRenderVAO(gl, buf0), this.createRenderVAO(gl, buf1)];

    // Create transform feedbacks
    const tfo0 = gl.createTransformFeedback()!;
    const tfo1 = gl.createTransformFeedback()!;
    this.tfos = [tfo0, tfo1];

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfo0);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buf0);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfo1);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buf1);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  }

  update(
    deltaTime: number,
    rms: number,
    centroid: number,
    beatIntensity: number,
    time: number,
  ): void {
    const gl = this.gl;
    const src = this.currentIndex;
    const dst = 1 - src;

    if (this.useCpuFallback || !this.updateProgram) {
      this.updateCpu(deltaTime, rms, centroid, beatIntensity, time);
      this.currentIndex = dst;
      return;
    }

    this.updateProgram.use();
    this.updateProgram.setFloat("u_deltaTime", deltaTime);
    this.updateProgram.setFloat("u_rms", rms);
    this.updateProgram.setFloat("u_centroid", centroid);
    this.updateProgram.setFloat("u_beatIntensity", beatIntensity);
    this.updateProgram.setFloat("u_time", time);

    gl.bindVertexArray(this.vaos[src]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tfos[dst]);

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);

    this.currentIndex = dst;
  }

  render(viewProj: Float32Array, beatIntensity: number, centroid: number, colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] }): void {
    const gl = this.gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive
    gl.depthMask(false);

    this.renderProgram.use();
    gl.uniformMatrix4fv(this.renderProgram.getUniform("u_viewProj"), false, viewProj);
    this.renderProgram.setFloat("u_beatIntensity", beatIntensity);
    this.renderProgram.setFloat("u_centroid", centroid);
    this.renderProgram.setVec3("u_primary", ...colors.primary);
    this.renderProgram.setVec3("u_secondary", ...colors.secondary);
    this.renderProgram.setVec3("u_accent", ...colors.accent);

    gl.bindVertexArray(this.vaos[this.currentIndex]);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.bindVertexArray(null);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffers[0]);
    gl.deleteBuffer(this.buffers[1]);
    gl.deleteVertexArray(this.vaos[0]);
    gl.deleteVertexArray(this.vaos[1]);
    gl.deleteTransformFeedback(this.tfos[0]);
    gl.deleteTransformFeedback(this.tfos[1]);
    this.updateProgram?.dispose();
    this.renderProgram.dispose();
  }

  private createBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const buf = gl.createBuffer();
    if (!buf) throw new Error("Failed to create particle buffer");
    return buf;
  }

  private createRenderVAO(gl: WebGL2RenderingContext, buffer: WebGLBuffer): WebGLVertexArrayObject {
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create particle VAO");
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const stride = FLOATS_PER_PARTICLE * 4;
    // a_position (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    // a_velocity (location 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    // a_life (location 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 24);
    // a_size (location 3)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 28);

    gl.bindVertexArray(null);
    return vao;
  }

  private createTFProgram(gl: WebGL2RenderingContext): ShaderProgram {
    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, updateVert);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(vertShader) ?? "TF vert compile failed");
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, TF_FRAG);
    gl.compileShader(fragShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);

    gl.transformFeedbackVaryings(
      program,
      ["v_position", "v_velocity", "v_life", "v_size"],
      gl.INTERLEAVED_ATTRIBS,
    );

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "TF link failed");
    }

    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    // Wrap in a ShaderProgram-like interface
    const sp = new ShaderProgram(gl, updateVert, TF_FRAG);
    // Replace the program — hacky but avoids rewriting ShaderProgram
    gl.deleteProgram(sp.program);
    Object.defineProperty(sp, "program", { value: program, writable: false });
    return sp;
  }

  private updateCpu(dt: number, rms: number, _centroid: number, beatIntensity: number, _time: number): void {
    if (!this.cpuData) return;
    const d = this.cpuData;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const b = i * FLOATS_PER_PARTICLE;
      let life = d[b + 6] - dt;

      if (life <= 0) {
        const angle = Math.random() * 6.28318;
        const angle2 = Math.random() * 3.14159 - 1.5708;
        const speed = (0.5 + Math.random() * 1.5) * (1 + beatIntensity * 3);
        d[b] = 0; d[b + 1] = 0; d[b + 2] = 0;
        d[b + 3] = Math.cos(angle) * Math.cos(angle2) * speed * (0.3 + rms * 2);
        d[b + 4] = Math.sin(angle2) * speed * (0.3 + rms * 2);
        d[b + 5] = Math.sin(angle) * Math.cos(angle2) * speed * (0.3 + rms * 2);
        life = 1 + Math.random() * 3;
        d[b + 7] = 2 + Math.random() * 4;
      } else {
        d[b] += d[b + 3] * dt;
        d[b + 1] += d[b + 4] * dt;
        d[b + 2] += d[b + 5] * dt;
        d[b + 3] *= 0.998;
        d[b + 4] -= 0.02 * dt;
        d[b + 5] *= 0.998;
      }
      d[b + 6] = life;
    }

    // Upload to current destination buffer
    const gl = this.gl;
    const dst = 1 - this.currentIndex;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[dst]);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);
  }
}
