import { ShaderProgram } from "./shaderProgram";
import { Framebuffer } from "./framebuffer";
import fullscreenVert from "../shaders/fullscreen.vert?raw";
import extractFrag from "../shaders/bloom_extract.frag?raw";
import blurFrag from "../shaders/bloom_blur.frag?raw";
import compositeFrag from "../shaders/bloom_composite.frag?raw";

export class BloomPipeline {
  private extractProgram: ShaderProgram;
  private blurProgram: ShaderProgram;
  private compositeProgram: ShaderProgram;
  private sceneFbo: Framebuffer;
  private pingFbo: Framebuffer;
  private pongFbo: Framebuffer;
  private vao: WebGLVertexArrayObject;

  constructor(
    private gl: WebGL2RenderingContext,
    width: number,
    height: number,
  ) {
    this.extractProgram = new ShaderProgram(gl, fullscreenVert, extractFrag);
    this.blurProgram = new ShaderProgram(gl, fullscreenVert, blurFrag);
    this.compositeProgram = new ShaderProgram(gl, fullscreenVert, compositeFrag);

    this.sceneFbo = new Framebuffer(gl, width, height);
    // Bloom at half resolution
    this.pingFbo = new Framebuffer(gl, Math.floor(width / 2), Math.floor(height / 2));
    this.pongFbo = new Framebuffer(gl, Math.floor(width / 2), Math.floor(height / 2));

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Failed to create bloom VAO");
    this.vao = vao;
  }

  get sceneFramebuffer(): Framebuffer {
    return this.sceneFbo;
  }

  resize(width: number, height: number): void {
    this.sceneFbo.resize(width, height);
    this.pingFbo.resize(Math.floor(width / 2), Math.floor(height / 2));
    this.pongFbo.resize(Math.floor(width / 2), Math.floor(height / 2));
  }

  render(intensity: number, targetFbo?: Framebuffer): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);

    // 1. Extract bright pixels
    this.pingFbo.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.extractProgram.use();
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFbo.texture);
    this.extractProgram.setInt("u_scene", 5);
    this.extractProgram.setFloat("u_threshold", 0.3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. Horizontal blur
    this.pongFbo.bind();
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.blurProgram.use();
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.pingFbo.texture);
    this.blurProgram.setInt("u_texture", 5);
    this.blurProgram.setVec2("u_direction", 1.0, 0.0);
    this.blurProgram.setVec2("u_resolution", this.pingFbo.width, this.pingFbo.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3. Vertical blur
    this.pingFbo.bind();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.pongFbo.texture);
    this.blurProgram.setInt("u_texture", 5);
    this.blurProgram.setVec2("u_direction", 0.0, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 4. Composite — render to targetFbo if provided, else to screen
    if (targetFbo) {
      targetFbo.bind();
    } else {
      this.sceneFbo.unbind();
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    this.compositeProgram.use();
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFbo.texture);
    this.compositeProgram.setInt("u_scene", 5);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.pingFbo.texture);
    this.compositeProgram.setInt("u_bloom", 6);
    this.compositeProgram.setFloat("u_intensity", intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteVertexArray(this.vao);
    this.extractProgram.dispose();
    this.blurProgram.dispose();
    this.compositeProgram.dispose();
    this.sceneFbo.dispose();
    this.pingFbo.dispose();
    this.pongFbo.dispose();
  }
}
