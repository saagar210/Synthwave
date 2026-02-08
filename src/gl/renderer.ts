import { ShaderProgram } from "./shaderProgram";
import { AudioTexture } from "./audioTexture";
import { BloomPipeline } from "./bloom";
import { Framebuffer } from "./framebuffer";
import { ParticleSystem } from "./particles";
import { perspective, lookAt, multiply } from "./math";
import type { ThemeColors } from "../stores/visualStore";
import type { VisualizationMode } from "../stores/visualStore";
import { THEMES } from "../themes";

// Shader imports
import fullscreenVert from "../shaders/fullscreen.vert?raw";
import waveformVert from "../shaders/waveform.vert?raw";
import waveformFrag from "../shaders/waveform.frag?raw";
import barsVert from "../shaders/bars.vert?raw";
import barsFrag from "../shaders/bars.frag?raw";
import circularFrag from "../shaders/circular.frag?raw";
import terrainVert from "../shaders/terrain.vert?raw";
import terrainFrag from "../shaders/terrain.frag?raw";
import nebulaFrag from "../shaders/nebula.frag?raw";
import starfieldFrag from "../shaders/starfield.frag?raw";
import transitionFrag from "../shaders/transition.frag?raw";

const HISTORY_SIZE = 128;
const GRID_SIZE = 128;
const BAR_COUNT = 64;

interface AudioData {
  spectrum: Float32Array;
  waveform: Float32Array;
  rms: number;
  centroid: number;
  flux: number;
  zcr: number;
  beat: boolean;
  bpm: number;
  beatIntensity: number;
}

export class Renderer {
  private spectrumTexture: AudioTexture;
  private waveformTexture: AudioTexture;
  private historyTexture: WebGLTexture;
  private historyOffset = 0;

  private waveformProgram: ShaderProgram;
  private barsProgram: ShaderProgram;
  private circularProgram: ShaderProgram;
  private terrainProgram: ShaderProgram;
  private nebulaProgram: ShaderProgram;
  private starfieldProgram: ShaderProgram;
  private transitionProgram: ShaderProgram;

  private waveformVao: WebGLVertexArrayObject;
  private barsVao: WebGLVertexArrayObject;
  private fullscreenVao: WebGLVertexArrayObject;

  private particles: ParticleSystem;
  private bloom: BloomPipeline;

  // Transition FBOs
  private finalFbo: Framebuffer;
  private transitionFbo: Framebuffer;
  private activeMode: VisualizationMode = "waveform";
  private transitionAlpha = 0;

  private currentColors: ThemeColors;
  private targetColors: ThemeColors;
  private colorTransition = 1.0;

  constructor(private gl: WebGL2RenderingContext) {
    // Check for float texture support
    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) console.warn("EXT_color_buffer_float not available, bloom may not work");

    // Audio textures
    this.spectrumTexture = new AudioTexture(gl, 1024, 0);
    this.waveformTexture = new AudioTexture(gl, 1024, 1);

    // History texture for terrain
    const histTex = gl.createTexture()!;
    this.historyTexture = histTex;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, histTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, 1024, HISTORY_SIZE, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Compile shader programs
    this.waveformProgram = new ShaderProgram(gl, waveformVert, waveformFrag);
    this.barsProgram = new ShaderProgram(gl, barsVert, barsFrag);
    this.circularProgram = new ShaderProgram(gl, fullscreenVert, circularFrag);
    this.terrainProgram = new ShaderProgram(gl, terrainVert, terrainFrag);
    this.nebulaProgram = new ShaderProgram(gl, fullscreenVert, nebulaFrag);
    this.starfieldProgram = new ShaderProgram(gl, fullscreenVert, starfieldFrag);
    this.transitionProgram = new ShaderProgram(gl, fullscreenVert, transitionFrag);

    // VAOs
    this.fullscreenVao = gl.createVertexArray()!;
    this.waveformVao = gl.createVertexArray()!;
    this.barsVao = gl.createVertexArray()!;

    // Particles
    this.particles = new ParticleSystem(gl);

    // Bloom
    this.bloom = new BloomPipeline(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Transition FBOs
    this.finalFbo = new Framebuffer(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.transitionFbo = new Framebuffer(gl, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // Theme
    this.currentColors = { ...THEMES[0].colors };
    this.targetColors = { ...THEMES[0].colors };
  }

  setTheme(index: number): void {
    const theme = THEMES[index % THEMES.length];
    this.targetColors = { ...theme.colors };
    this.colorTransition = 0;
  }

  updateAudioData(data: AudioData): void {
    this.spectrumTexture.update(data.spectrum);
    this.waveformTexture.update(data.waveform);

    // Update terrain history
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.historyTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, this.historyOffset,
      Math.min(data.spectrum.length, 1024), 1,
      gl.RED, gl.FLOAT, data.spectrum,
    );
    this.historyOffset = (this.historyOffset + 1) % HISTORY_SIZE;
  }

  render(time: number, deltaTime: number, mode: VisualizationMode, audioData: AudioData | null): void {
    const gl = this.gl;
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;

    // Resize transition FBOs if needed
    this.finalFbo.resize(w, h);
    this.transitionFbo.resize(w, h);

    // Theme transition
    if (this.colorTransition < 1.0) {
      this.colorTransition = Math.min(1.0, this.colorTransition + deltaTime * 2.0);
      this.currentColors = this.lerpColors(this.currentColors, this.targetColors, this.colorTransition);
    }

    const colors = this.currentColors;
    const rms = audioData?.rms ?? 0;
    const centroid = audioData?.centroid ?? 0;
    const beatIntensity = audioData?.beatIntensity ?? 0;

    // Check mode change BEFORE rendering (finalFbo still has previous frame)
    if (mode !== this.activeMode) {
      this.copyFbo(this.finalFbo, this.transitionFbo);
      this.transitionAlpha = 1.0;
      this.activeMode = mode;
    }

    // Resize bloom if needed
    this.bloom.resize(w, h);

    // Render scene into bloom FBO
    this.bloom.sceneFramebuffer.bind();
    gl.clearColor(colors.background[0], colors.background[1], colors.background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.renderMode(mode, time, deltaTime, rms, centroid, beatIntensity, colors);

    // Apply bloom → finalFbo
    this.bloom.sceneFramebuffer.unbind();
    gl.viewport(0, 0, w, h);
    const bloomIntensity = 0.3 + rms * 0.5 + beatIntensity * 0.3;
    this.bloom.render(bloomIntensity, this.finalFbo);

    // Blit finalFbo to screen
    this.blitToScreen(this.finalFbo);

    // Overlay fading snapshot if transitioning
    if (this.transitionAlpha > 0.01) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      this.transitionProgram.use();
      gl.activeTexture(gl.TEXTURE7);
      gl.bindTexture(gl.TEXTURE_2D, this.transitionFbo.texture);
      this.transitionProgram.setInt("u_snapshot", 7);
      this.transitionProgram.setFloat("u_alpha", this.transitionAlpha);

      gl.bindVertexArray(this.fullscreenVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      gl.disable(gl.BLEND);
      this.transitionAlpha -= deltaTime * 2.0; // 500ms fade
    }
  }

  private renderMode(
    mode: VisualizationMode,
    time: number,
    deltaTime: number,
    rms: number,
    centroid: number,
    beatIntensity: number,
    colors: ThemeColors,
  ): void {
    switch (mode) {
      case "waveform":
        this.renderWaveform(time, rms, beatIntensity, colors);
        break;
      case "bars":
        this.renderBars(time, rms, beatIntensity, colors);
        break;
      case "circular":
        this.renderCircular(time, rms, beatIntensity, colors);
        break;
      case "particles":
        this.renderParticles(time, deltaTime, rms, centroid, beatIntensity, colors);
        break;
      case "terrain":
        this.renderTerrain(time, beatIntensity, colors);
        break;
      case "nebula":
        this.renderNebula(time, rms, centroid, beatIntensity, colors);
        break;
      case "starfield":
        this.renderStarfield(time, rms, beatIntensity, colors);
        break;
    }
  }

  private copyFbo(src: Framebuffer, dst: Framebuffer): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.fbo);
    gl.blitFramebuffer(
      0, 0, src.width, src.height,
      0, 0, dst.width, dst.height,
      gl.COLOR_BUFFER_BIT, gl.NEAREST,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }

  private blitToScreen(src: Framebuffer): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(
      0, 0, src.width, src.height,
      0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
      gl.COLOR_BUFFER_BIT, gl.NEAREST,
    );
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }

  private renderWaveform(_time: number, rms: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;
    this.waveformProgram.use();
    this.spectrumTexture.bind();
    this.waveformTexture.bind();
    this.waveformProgram.setInt("u_waveform", 1);
    this.waveformProgram.setFloat("u_rms", rms);
    this.waveformProgram.setFloat("u_beatIntensity", beatIntensity);
    this.waveformProgram.setVec3("u_primary", ...colors.primary);
    this.waveformProgram.setVec3("u_secondary", ...colors.secondary);
    this.waveformProgram.setVec2("u_resolution", gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.bindVertexArray(this.waveformVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 1024 * 2);
    gl.bindVertexArray(null);
  }

  private renderBars(_time: number, _rms: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;
    this.barsProgram.use();
    this.spectrumTexture.bind();
    this.barsProgram.setInt("u_spectrum", 0);
    this.barsProgram.setFloat("u_beatIntensity", beatIntensity);
    this.barsProgram.setInt("u_barCount", BAR_COUNT);
    this.barsProgram.setVec2("u_resolution", gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.barsProgram.setVec3("u_primary", ...colors.primary);
    this.barsProgram.setVec3("u_secondary", ...colors.secondary);
    this.barsProgram.setVec3("u_accent", ...colors.accent);

    gl.bindVertexArray(this.barsVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, BAR_COUNT);
    gl.bindVertexArray(null);
  }

  private renderCircular(time: number, rms: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;
    this.circularProgram.use();
    this.spectrumTexture.bind();
    this.circularProgram.setInt("u_spectrum", 0);
    this.circularProgram.setFloat("u_time", time);
    this.circularProgram.setFloat("u_rms", rms);
    this.circularProgram.setFloat("u_beatIntensity", beatIntensity);
    this.circularProgram.setVec2("u_resolution", gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.circularProgram.setVec3("u_primary", ...colors.primary);
    this.circularProgram.setVec3("u_secondary", ...colors.secondary);
    this.circularProgram.setVec3("u_accent", ...colors.accent);

    gl.bindVertexArray(this.fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private renderParticles(time: number, deltaTime: number, rms: number, centroid: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;

    this.particles.update(deltaTime, rms, centroid, beatIntensity, time);

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const proj = perspective(Math.PI / 3, aspect, 0.1, 100);
    const view = lookAt([0, 1, 4], [0, 0, 0], [0, 1, 0]);
    const viewProj = multiply(proj, view);

    this.particles.render(viewProj, beatIntensity, centroid, colors);
  }

  private renderTerrain(time: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;
    this.terrainProgram.use();

    this.spectrumTexture.bind();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.historyTexture);
    this.terrainProgram.setInt("u_spectrum", 0);
    this.terrainProgram.setInt("u_history", 2);

    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const proj = perspective(Math.PI / 4, aspect, 0.1, 50);
    const view = lookAt([0, 2.5, 3], [0, 0, -1], [0, 1, 0]);
    const viewProj = multiply(proj, view);
    gl.uniformMatrix4fv(this.terrainProgram.getUniform("u_viewProj"), false, viewProj);

    this.terrainProgram.setFloat("u_time", time);
    this.terrainProgram.setFloat("u_beatIntensity", beatIntensity);
    this.terrainProgram.setInt("u_gridSize", GRID_SIZE);
    this.terrainProgram.setInt("u_historyOffset", this.historyOffset);
    this.terrainProgram.setInt("u_historySize", HISTORY_SIZE);
    this.terrainProgram.setVec3("u_primary", ...colors.primary);
    this.terrainProgram.setVec3("u_secondary", ...colors.secondary);
    this.terrainProgram.setVec3("u_accent", ...colors.accent);
    this.terrainProgram.setVec3("u_background", ...colors.background);

    gl.bindVertexArray(this.fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, (GRID_SIZE - 1) * (GRID_SIZE - 1) * 6);
    gl.bindVertexArray(null);
  }

  private renderNebula(time: number, rms: number, centroid: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;
    this.nebulaProgram.use();
    this.spectrumTexture.bind();
    this.nebulaProgram.setInt("u_spectrum", 0);
    this.nebulaProgram.setFloat("u_time", time);
    this.nebulaProgram.setFloat("u_rms", rms);
    this.nebulaProgram.setFloat("u_centroid", centroid);
    this.nebulaProgram.setFloat("u_beatIntensity", beatIntensity);
    this.nebulaProgram.setVec2("u_resolution", gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.nebulaProgram.setVec3("u_primary", ...colors.primary);
    this.nebulaProgram.setVec3("u_secondary", ...colors.secondary);
    this.nebulaProgram.setVec3("u_accent", ...colors.accent);
    this.nebulaProgram.setVec3("u_background", ...colors.background);

    gl.bindVertexArray(this.fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private renderStarfield(time: number, rms: number, beatIntensity: number, colors: ThemeColors): void {
    const gl = this.gl;
    this.starfieldProgram.use();
    this.spectrumTexture.bind();
    this.starfieldProgram.setInt("u_spectrum", 0);
    this.starfieldProgram.setFloat("u_time", time);
    this.starfieldProgram.setFloat("u_rms", rms);
    this.starfieldProgram.setFloat("u_beatIntensity", beatIntensity);
    this.starfieldProgram.setVec2("u_resolution", gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.starfieldProgram.setVec3("u_primary", ...colors.primary);
    this.starfieldProgram.setVec3("u_secondary", ...colors.secondary);
    this.starfieldProgram.setVec3("u_accent", ...colors.accent);
    this.starfieldProgram.setVec3("u_background", ...colors.background);

    gl.bindVertexArray(this.fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private lerpColors(a: ThemeColors, b: ThemeColors, t: number): ThemeColors {
    const lerp3 = (x: [number, number, number], y: [number, number, number]): [number, number, number] => [
      x[0] + (y[0] - x[0]) * t,
      x[1] + (y[1] - x[1]) * t,
      x[2] + (y[2] - x[2]) * t,
    ];
    return {
      background: lerp3(a.background, b.background),
      primary: lerp3(a.primary, b.primary),
      secondary: lerp3(a.secondary, b.secondary),
      accent: lerp3(a.accent, b.accent),
    };
  }

  dispose(): void {
    const gl = this.gl;
    this.spectrumTexture.dispose();
    this.waveformTexture.dispose();
    gl.deleteTexture(this.historyTexture);
    this.waveformProgram.dispose();
    this.barsProgram.dispose();
    this.circularProgram.dispose();
    this.terrainProgram.dispose();
    this.nebulaProgram.dispose();
    this.starfieldProgram.dispose();
    this.transitionProgram.dispose();
    gl.deleteVertexArray(this.fullscreenVao);
    gl.deleteVertexArray(this.waveformVao);
    gl.deleteVertexArray(this.barsVao);
    this.particles.dispose();
    this.bloom.dispose();
    this.finalFbo.dispose();
    this.transitionFbo.dispose();
  }
}
